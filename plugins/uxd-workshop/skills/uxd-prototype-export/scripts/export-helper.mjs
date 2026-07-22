#!/usr/bin/env node
/**
 * Optional localhost writer for Prototype Bar exports.
 * Usage: node export-helper.mjs --out .artifacts/PROJ-298/exports [--port 9417]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { out: path.resolve(process.cwd(), '.artifacts/exports'), port: 9417 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' && argv[i + 1]) {
      opts.out = path.resolve(argv[++i]);
    } else if (a === '--port' && argv[i + 1]) {
      opts.port = Number(argv[++i]);
    } else if (a === '--help' || a === '-h') {
      opts.help = true;
    }
  }
  return opts;
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const opts = parseArgs(process.argv);
if (opts.help) {
  console.log(`Usage: node export-helper.mjs --out <dir> [--port 9417]

Listens on 127.0.0.1 only. Prototype Bar POSTs JSON:
  { "filename": "current/page.html", "body": "...", "format": "html" }
`);
  process.exit(0);
}

fs.mkdirSync(opts.out, { recursive: true });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${opts.port}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, out: opts.out });
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

  sendJson(res, 404, { error: 'not found' });
});

server.listen(opts.port, '127.0.0.1', () => {
  console.log(`uxd export helper listening on http://127.0.0.1:${opts.port}`);
  console.log(`Writing exports to ${opts.out}`);
  console.log(`Skill dir hint: ${path.resolve(__dirname, '..')}`);
});
