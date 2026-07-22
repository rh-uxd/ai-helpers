#!/usr/bin/env node
/**
 * Optional localhost writer + eval report server for Prototype Bar.
 * Usage:
 *   node export-helper.mjs --out .artifacts/PROJ-298/exports [--port 9417]
 *   node export-helper.mjs --out .artifacts/PROJ-298/exports --artifacts .artifacts
 *
 * GET  /health              → { ok, out, artifacts }
 * POST /export              → write capture under --out
 * GET  /evals/:id[/…]       → serve .artifacts/:id/evaluation-report.html (+ siblings)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = {
    out: path.resolve(process.cwd(), '.artifacts/exports'),
    artifacts: '',
    port: 9417,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' && argv[i + 1]) {
      opts.out = path.resolve(argv[++i]);
    } else if (a === '--artifacts' && argv[i + 1]) {
      opts.artifacts = path.resolve(argv[++i]);
    } else if (a === '--port' && argv[i + 1]) {
      opts.port = Number(argv[++i]);
    } else if (a === '--help' || a === '-h') {
      opts.help = true;
    }
  }
  return opts;
}

function resolveArtifactsRoot(out, explicit) {
  if (explicit) return path.resolve(explicit);
  const resolved = path.resolve(out);
  // Typical: .artifacts/{ID}/exports → .artifacts
  if (path.basename(resolved) === 'exports') {
    return path.resolve(resolved, '..', '..');
  }
  // .artifacts/{ID} → .artifacts
  if (fs.existsSync(path.join(resolved, '..')) && path.basename(path.dirname(resolved)) === '.artifacts') {
    return path.dirname(resolved);
  }
  const cwdArtifacts = path.resolve(process.cwd(), '.artifacts');
  if (fs.existsSync(cwdArtifacts)) return cwdArtifacts;
  return path.resolve(resolved, '..');
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  };
}

function safeJoin(root, rel) {
  const cleaned = String(rel || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\./g, '');
  const full = path.resolve(root, cleaned);
  if (!full.startsWith(path.resolve(root))) {
    throw new Error('Path escapes output directory');
  }
  return full;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function injectEvalBar(html, id) {
  // Ensure eval pages can show the bar with data-uxd-view=eval if config is known
  if (/id=["']uxd-prototype-bar["']/.test(html)) return html;
  const cfgPath = path.join(opts.artifactsRoot, id, 'prototype-bar.json');
  let cfgScript = '';
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      cfgScript = `<script>window.__UXD_PROTOTYPE__=${JSON.stringify(cfg)};</script>\n`;
    } catch {
      /* ignore */
    }
  } else {
    cfgScript = `<script>window.__UXD_PROTOTYPE__=${JSON.stringify({
      id,
      views: { prototype: '/', eval: `/evals/${id}/` },
      sources: [],
    })};</script>\n`;
  }
  // Inject config + view marker (bar chrome may already be on the report or co-hosted).
  const marker = `<script>document.documentElement.setAttribute('data-uxd-view','eval');</script>\n${cfgScript}`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${marker}</head>`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>\n${marker}`);
  }
  return marker + html;
}

const opts = parseArgs(process.argv);
opts.artifactsRoot = resolveArtifactsRoot(opts.out, opts.artifacts);

if (opts.help) {
  console.log(`Usage: node export-helper.mjs --out <dir> [--artifacts <dir>] [--port 9417]

Listens on 127.0.0.1 only.

  POST /export   Prototype Bar writes captures:
                 { "filename": "current/page.html", "body": "...", "format": "html" }
  GET  /evals/:id[/path]  Serve evaluation-report.html (and siblings) from
                 <artifacts>/:id/
`);
  process.exit(0);
}

fs.mkdirSync(opts.out, { recursive: true });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${opts.port}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, out: opts.out, artifacts: opts.artifactsRoot });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/export') {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      if (!payload.filename || typeof payload.body !== 'string') {
        sendJson(res, 400, { error: 'filename and body required' });
        return;
      }
      const dest = safeJoin(opts.out, payload.filename);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, payload.body, 'utf8');
      console.log(`Wrote ${dest}`);
      sendJson(res, 200, { ok: true, path: dest });
    } catch (err) {
      sendJson(res, 500, { error: err.message || String(err) });
    }
    return;
  }

  // GET /evals/:id or /evals/:id/...
  const evalMatch = url.pathname.match(/^\/evals\/([^/]+)(?:\/(.*))?$/);
  if (req.method === 'GET' && evalMatch) {
    const id = decodeURIComponent(evalMatch[1]);
    const rest = (evalMatch[2] || '').replace(/\/+$/, '');
    const artifactDir = safeJoin(opts.artifactsRoot, id);

    if (!fs.existsSync(artifactDir) || !fs.statSync(artifactDir).isDirectory()) {
      sendJson(res, 404, { error: `No artifacts for ${id}`, lookedIn: artifactDir });
      return;
    }

    let filePath;
    if (!rest || rest === '' || rest === 'index.html') {
      const report = path.join(artifactDir, 'evaluation-report.html');
      if (!fs.existsSync(report)) {
        sendJson(res, 404, {
          error: 'evaluation-report.html not found',
          lookedIn: artifactDir,
          hint: 'Run uxd-prototype-evaluate first',
        });
        return;
      }
      filePath = report;
    } else {
      try {
        filePath = safeJoin(artifactDir, rest);
      } catch (err) {
        sendJson(res, 400, { error: err.message || String(err) });
        return;
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        sendJson(res, 404, { error: 'file not found', path: rest });
        return;
      }
    }

    try {
      let body = fs.readFileSync(filePath);
      const ct = contentTypeFor(filePath);
      if (ct.startsWith('text/html') && (!rest || rest === '' || rest === 'index.html')) {
        body = Buffer.from(injectEvalBar(body.toString('utf8'), id), 'utf8');
      }
      res.writeHead(200, corsHeaders({ 'Content-Type': ct, 'Content-Length': body.length }));
      res.end(body);
    } catch (err) {
      sendJson(res, 500, { error: err.message || String(err) });
    }
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(opts.port, '127.0.0.1', () => {
  console.log(`uxd export helper listening on http://127.0.0.1:${opts.port}`);
  console.log(`Writing exports to ${opts.out}`);
  console.log(`Serving evals from ${opts.artifactsRoot}/<id>/`);
  console.log(`Skill dir hint: ${path.resolve(__dirname, '..')}`);
});
