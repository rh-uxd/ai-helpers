'use strict';

/**
 * Load product overlay YAML (template + optional local/env overlay).
 *
 * Precedence (later wins for scalar keys):
 *   1. config/product-overlay.yaml          (checked-in template)
 *   2. config/product-overlay.local.yaml    (gitignored; team-specific)
 *   3. EVAL_OVERLAY_PATH / UXD_OVERLAY_PATH (absolute or skill-relative path)
 *
 * CLI: node overlay-get.js <dotted.key>
 * Prints the scalar (or empty string). Nested maps print JSON.
 */

const fs = require('fs');
const path = require('path');

const SKILL_ROOT = path.resolve(__dirname, '..');

function readFileOr(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function stripInlineComment(s) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '#' && !inSingle && !inDouble) return s.slice(0, i).trim();
  }
  return s.trim();
}

function unquote(val) {
  if (val == null) return '';
  let v = stripInlineComment(String(val));
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  // Unexpanded ${ENV:-} placeholders are treated as empty
  if (/^\$\{.+\}$/.test(v)) return '';
  if (v === '{}') return {};
  if (v === '[]') return [];
  return v;
}

function nextMeaningful(lines, from) {
  for (let j = from + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (!t || t.startsWith('#')) continue;
    return lines[j];
  }
  return '';
}

/**
 * Minimal YAML parser for overlay files: nested maps, scalar values,
 * and lists of maps (`- key: val` items). Not a general YAML implementation.
 */
function parseSimpleYaml(raw) {
  const root = {};
  const stack = [{ indent: -1, container: root, kind: 'map' }];
  const lines = String(raw || '').split('\n');

  function peel(indent) {
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
  }

  function currentMap() {
    const top = stack[stack.length - 1];
    if (top.kind === 'list-item' || top.kind === 'map') return top.container;
    return root;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const trimmed = line.trim();

    peel(indent);

    const listStart = trimmed.match(/^- (\w[\w-]*)\s*:\s*(.*)$/);
    if (listStart) {
      const top = stack[stack.length - 1];
      if (!Array.isArray(top.container)) continue;
      const item = {};
      const val = unquote(listStart[2]);
      if (val !== '') item[listStart[1]] = val;
      top.container.push(item);
      stack.push({ indent, container: item, kind: 'list-item' });
      continue;
    }

    const kv = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const rawVal = kv[2];
    const map = currentMap();
    if (typeof map !== 'object' || Array.isArray(map)) continue;

    if (rawVal === '' || rawVal === '|' || rawVal === '>') {
      const next = nextMeaningful(lines, i);
      const isList = next.trim().startsWith('- ');
      if (isList) {
        map[key] = [];
        stack.push({ indent, container: map[key], kind: 'list' });
      } else {
        map[key] = {};
        stack.push({ indent, container: map[key], kind: 'map' });
      }
      continue;
    }

    map[key] = unquote(rawVal);
  }

  return root;
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, overlay) {
  if (!isPlainObject(overlay)) return overlay === undefined ? base : overlay;
  const out = isPlainObject(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(overlay)) {
    if (Array.isArray(v)) {
      out[k] = v.length ? v : (Array.isArray(out[k]) ? out[k] : v);
    } else if (isPlainObject(v)) {
      out[k] = deepMerge(out[k], v);
    } else if (v === '' || v === undefined) {
      if (out[k] === undefined) out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function resolveOverlayPath(p) {
  if (!p) return '';
  return path.isAbsolute(p) ? p : path.resolve(SKILL_ROOT, p);
}

function loadOverlay() {
  const files = [
    path.join(SKILL_ROOT, 'config', 'product-overlay.yaml'),
    path.join(SKILL_ROOT, 'config', 'product-overlay.local.yaml'),
  ];
  const envPath = process.env.EVAL_OVERLAY_PATH || process.env.UXD_OVERLAY_PATH;
  if (envPath) files.push(resolveOverlayPath(envPath));

  let merged = {};
  for (const file of files) {
    const raw = readFileOr(file);
    if (!raw.trim()) continue;
    merged = deepMerge(merged, parseSimpleYaml(raw));
  }
  return merged;
}

function get(dotted) {
  const obj = loadOverlay();
  if (!dotted) return obj;
  const parts = String(dotted).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = cur[p];
  }
  if (cur == null) return '';
  if (typeof cur === 'object') return cur;
  return String(cur);
}

if (require.main === module) {
  const key = process.argv[2];
  if (!key) {
    console.error('Usage: overlay-get.js <dotted.key>');
    process.exit(1);
  }
  const val = get(key);
  if (typeof val === 'object') {
    process.stdout.write(JSON.stringify(val));
  } else {
    process.stdout.write(val);
  }
}

module.exports = {
  SKILL_ROOT,
  loadOverlay,
  get,
  parseSimpleYaml,
  deepMerge,
};
