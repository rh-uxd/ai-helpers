#!/usr/bin/env node
/**
 * Embed the standalone Prototype Bar into an HTML document (eval reports, etc.).
 *
 * Usage:
 *   node inject-prototype-bar-into-html.mjs --html report.html --artifacts .artifacts/PROJ-298
 *   node inject-prototype-bar-into-html.mjs --html report.html --artifacts .artifacts/PROJ-298 --view eval
 *   node inject-prototype-bar-into-html.mjs --html report.html --config prototype-bar.json --out out.html
 *
 * Also importable:
 *   import { injectPrototypeBar } from './inject-prototype-bar-into-html.mjs';
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, '../templates');

function parseArgs(argv) {
  const opts = {
    html: '',
    artifacts: '',
    config: '',
    out: '',
    view: 'eval',
    prototypeUrl: '',
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--html' && argv[i + 1]) opts.html = path.resolve(argv[++i]);
    else if (a === '--artifacts' && argv[i + 1]) opts.artifacts = path.resolve(argv[++i]);
    else if (a === '--config' && argv[i + 1]) opts.config = path.resolve(argv[++i]);
    else if (a === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (a === '--view' && argv[i + 1]) opts.view = String(argv[++i]);
    else if (a === '--prototype-url' && argv[i + 1]) opts.prototypeUrl = String(argv[++i]);
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function resolveConfig({ artifacts, config, prototypeUrl, idHint }) {
  let cfgPath = config;
  if (!cfgPath && artifacts) {
    const candidate = path.join(artifacts, 'prototype-bar.json');
    if (fs.existsSync(candidate)) cfgPath = candidate;
  }

  let cfg = cfgPath && fs.existsSync(cfgPath) ? readJson(cfgPath) : null;
  const id =
    (cfg && cfg.id) ||
    (artifacts ? path.basename(artifacts) : '') ||
    idHint ||
    'prototype';

  if (!cfg) {
    cfg = {
      id,
      sources: [],
      views: { prototype: null, eval: `/evals/${id}/` },
      scenarios: [],
    };
  }

  cfg = { ...cfg, views: { ...(cfg.views || {}) } };
  if (prototypeUrl) {
    cfg.views.prototype = prototypeUrl;
  }
  if (cfg.views.eval == null || cfg.views.eval === '') {
    cfg.views.eval = `/evals/${cfg.id || id}/`;
  }
  return cfg;
}

function stripPriorInjection(html) {
  return html
    .replace(/<style[^>]*data-uxd-prototype-bar-style[^>]*>[\s\S]*?<\/style>\s*/gi, '')
    .replace(/<script[^>]*data-uxd-prototype-bar(?:="[^"]*")?[^>]*>[\s\S]*?<\/script>\s*/gi, '')
    .replace(/<link[^>]*data-uxd-prototype-bar[^>]*>\s*/gi, '');
}

function setHtmlAttrs(html, view) {
  const attrs = [];
  if (view === 'eval') {
    attrs.push('data-uxd-eval-report="true"', `data-uxd-view="eval"`);
  } else if (view) {
    attrs.push(`data-uxd-view="${String(view).replace(/"/g, '')}"`);
  }
  if (!attrs.length) return html;

  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, (full, existing) => {
      let attrsStr = existing || '';
      for (const attr of attrs) {
        const name = attr.split('=')[0];
        const re = new RegExp(`\\s*${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
        attrsStr = attrsStr.replace(re, '');
        attrsStr = `${attrsStr} ${attr}`;
      }
      return `<html${attrsStr}>`;
    });
  }
  return `<html ${attrs.join(' ')}>\n${html}\n</html>`;
}

/**
 * @param {string} html
 * @param {{ artifacts?: string, configPath?: string, config?: object, view?: string, prototypeUrl?: string, id?: string }} options
 * @returns {string}
 */
export function injectPrototypeBar(html, options = {}) {
  const view = options.view || 'eval';
  const cfg =
    options.config ||
    resolveConfig({
      artifacts: options.artifacts || '',
      config: options.configPath || '',
      prototypeUrl: options.prototypeUrl || '',
      idHint: options.id || '',
    });

  const cssPath = path.join(TEMPLATE_DIR, 'prototype-bar.css');
  const jsPath = path.join(TEMPLATE_DIR, 'prototype-bar-standalone.js');
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
    throw new Error(`Prototype Bar templates missing under ${TEMPLATE_DIR}`);
  }

  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');
  const cfgJson = JSON.stringify(cfg);

  let out = stripPriorInjection(html);
  out = setHtmlAttrs(out, view);

  const headSnippet = [
    `<script data-uxd-prototype-bar="view">document.documentElement.setAttribute('data-uxd-view',${JSON.stringify(view)});</script>`,
    `<script data-uxd-prototype-bar="config">window.__UXD_PROTOTYPE__=${cfgJson};</script>`,
    `<style data-uxd-prototype-bar-style>\n${css}\n</style>`,
  ].join('\n');

  const bodySnippet = `<script data-uxd-prototype-bar="standalone">\n${js}\n</script>`;

  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${headSnippet}\n</head>`);
  } else if (/<body\b[^>]*>/i.test(out)) {
    out = out.replace(/<body\b([^>]*)>/i, `<body$1>\n${headSnippet}`);
  } else {
    out = `${headSnippet}\n${out}`;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${bodySnippet}\n</body>`);
  } else {
    out = `${out}\n${bodySnippet}\n`;
  }

  return out;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.html) {
    console.log(`Usage: node inject-prototype-bar-into-html.mjs --html <file> [--artifacts <key-dir>] [--config <prototype-bar.json>] [--view eval] [--prototype-url URL] [--out <file>]`);
    process.exit(opts.help ? 0 : 1);
  }
  if (!fs.existsSync(opts.html)) {
    console.error(`HTML not found: ${opts.html}`);
    process.exit(1);
  }

  const input = fs.readFileSync(opts.html, 'utf8');
  const output = injectPrototypeBar(input, {
    artifacts: opts.artifacts,
    configPath: opts.config,
    view: opts.view,
    prototypeUrl: opts.prototypeUrl,
  });
  const dest = opts.out || opts.html;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, output, 'utf8');
  console.log(`Injected Prototype Bar → ${dest}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
