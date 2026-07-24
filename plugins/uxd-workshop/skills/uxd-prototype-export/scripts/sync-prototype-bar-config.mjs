#!/usr/bin/env node
/**
 * Create or merge .artifacts/{ID}/prototype-bar.json from metadata + optional outcome.
 *
 * Usage:
 *   node sync-prototype-bar-config.mjs --artifacts .artifacts/PROJ-298
 *   node sync-prototype-bar-config.mjs --artifacts .artifacts/PROJ-298 --eval-url /evals/PROJ-298/
 *   node sync-prototype-bar-config.mjs --artifacts .artifacts/PROJ-298 --jira-base https://issues.example.com/browse/
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const opts = {
    artifacts: '',
    evalUrl: null,
    prototypeUrl: null,
    jiraBase: 'https://issues.redhat.com/browse/',
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--artifacts' && argv[i + 1]) opts.artifacts = path.resolve(argv[++i]);
    else if (a === '--eval-url' && argv[i + 1]) opts.evalUrl = argv[++i];
    else if (a === '--prototype-url' && argv[i + 1]) opts.prototypeUrl = argv[++i];
    else if (a === '--jira-base' && argv[i + 1]) opts.jiraBase = argv[++i];
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

function normalizeJiraBase(base) {
  const b = String(base || '').trim();
  if (!b) return 'https://issues.redhat.com/browse/';
  return b.endsWith('/') ? b : `${b}/`;
}

function jiraUrl(base, key) {
  if (!key) return undefined;
  return `${normalizeJiraBase(base)}${key}`;
}

function sourceKey(s) {
  return `${s.kind || 'other'}::${s.key || s.url || s.label || ''}`;
}

function mergeSources(existing, incoming) {
  const map = new Map();
  for (const s of existing || []) {
    if (s && (s.key || s.url || s.label)) map.set(sourceKey(s), s);
  }
  for (const s of incoming || []) {
    if (s && (s.key || s.url || s.label)) map.set(sourceKey(s), { ...map.get(sourceKey(s)), ...s });
  }
  return Array.from(map.values());
}

function sourcesFromMetadata(meta, jiraBase) {
  const sources = [];
  const src = meta.source || {};
  const type = src.type || (src.reference ? 'jira' : null);

  if (Array.isArray(meta.source_rfes) && meta.source_rfes.length) {
    for (const key of meta.source_rfes) {
      sources.push({
        kind: 'rfe',
        key,
        label: 'RFE',
        url: jiraUrl(jiraBase, key),
      });
    }
  } else if (type === 'jira' && src.reference) {
    sources.push({
      kind: 'rfe',
      key: src.reference,
      label: 'RFE',
      url: jiraUrl(jiraBase, src.reference),
    });
  } else if (type === 'figma' && src.reference) {
    sources.push({
      kind: 'figma',
      label: 'Figma',
      url: src.reference,
    });
  } else if (type === 'description') {
    sources.push({ kind: 'description', label: 'Feature description' });
  } else if (type === 'idea') {
    sources.push({ kind: 'idea', label: 'Concept / idea' });
  }

  // Figma alongside Jira when both present
  if (meta.figma_url || meta.figmaUrl) {
    sources.push({
      kind: 'figma',
      label: 'Figma',
      url: meta.figma_url || meta.figmaUrl,
    });
  }

  if (Array.isArray(meta.sources)) {
    return mergeSources(sources, meta.sources);
  }
  return sources;
}

function sourcesFromOutcome(outcome, jiraBase) {
  if (!outcome || typeof outcome !== 'object') return [];
  const out = [];
  const key = outcome.key || outcome.outcome_key || outcome.issue_key;
  if (key) {
    out.push({
      kind: 'outcome',
      key,
      label: 'Outcome',
      url: outcome.url || jiraUrl(jiraBase, key),
    });
  }
  const strat = outcome.strat_key || outcome.strat || outcome.parent_key;
  if (strat) {
    out.push({
      kind: 'strat',
      key: strat,
      label: 'Strat',
      url: jiraUrl(jiraBase, strat),
    });
  }
  if (Array.isArray(outcome.related_keys)) {
    for (const k of outcome.related_keys) {
      out.push({ kind: 'other', key: k, label: k, url: jiraUrl(jiraBase, k) });
    }
  }
  return out;
}

/** Flatten scenarios.json pages → slim bar list { route, id, name, default? } */
function flattenScenarios(scenariosDoc) {
  if (!scenariosDoc || !Array.isArray(scenariosDoc.pages)) return [];
  const out = [];
  for (const page of scenariosDoc.pages) {
    if (!page || !page.route) continue;
    const list = Array.isArray(page.scenarios) ? page.scenarios : [];
    for (const s of list) {
      if (!s || !s.id) continue;
      const entry = {
        route: page.route,
        id: s.id,
        name: s.name || s.id,
      };
      if (s.default === true || s.id === 'default') entry.default = true;
      out.push(entry);
    }
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.artifacts) {
    console.log(`Usage: node sync-prototype-bar-config.mjs --artifacts <dir> [--eval-url URL] [--jira-base URL]`);
    process.exit(opts.help ? 0 : 1);
  }

  const artifacts = opts.artifacts;
  const id = path.basename(artifacts);
  const metaPath = path.join(artifacts, 'metadata.json');
  const outcomePath = path.join(artifacts, 'outcome-context.json');
  const scenariosPath = path.join(artifacts, 'scenarios.json');
  const outPath = path.join(artifacts, 'prototype-bar.json');
  const reportUrlPath = path.join(artifacts, 'report-url.txt');

  const meta = readJson(metaPath) || {};
  const outcome = readJson(outcomePath);
  const scenariosDoc = readJson(scenariosPath);
  const existing = readJson(outPath) || {};

  const jiraBase = normalizeJiraBase(
    opts.jiraBase || existing.jiraBaseUrl || meta.jira_base_url || meta.jiraBaseUrl
  );

  let evalUrl = opts.evalUrl;
  if (evalUrl == null && fs.existsSync(reportUrlPath)) {
    evalUrl = fs.readFileSync(reportUrlPath, 'utf8').trim() || null;
  }
  if (evalUrl == null && existing.views && existing.views.eval) {
    evalUrl = existing.views.eval;
  }
  // Conventional relative path so Pages/static hosting can resolve once copied
  if (evalUrl == null) {
    evalUrl = `/evals/${id}/`;
  }

  const sources = mergeSources(
    mergeSources(existing.sources, sourcesFromMetadata(meta, jiraBase)),
    sourcesFromOutcome(outcome, jiraBase)
  );

  const scenarios = flattenScenarios(scenariosDoc);
  // Prefer freshly synced scenarios.json; keep existing only if no scenarios file
  const scenariosOut = scenarios.length
    ? scenarios
    : Array.isArray(existing.scenarios)
      ? existing.scenarios
      : [];

  const isLocalHostUrl = (url) =>
    typeof url === 'string' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(url);

  let prototypeUrl = opts.prototypeUrl;
  if (prototypeUrl == null && existing.views && existing.views.prototype != null) {
    // Drop stale localhost URLs from local create — they break Eval→Prototype on Pages
    prototypeUrl = isLocalHostUrl(existing.views.prototype)
      ? null
      : existing.views.prototype;
  }
  if (prototypeUrl == null) {
    // Prefer published Pages preview URL so Eval → Prototype works cross-origin
    const publish = meta.publish || meta.submission || {};
    prototypeUrl =
      publish.pages_url || meta.prototype_url || meta.preview_url || null;
  }

  const config = {
    id: existing.id || meta.prototype_id || id,
    title: meta.title || existing.title || id,
    jiraBaseUrl: jiraBase,
    sources,
    views: {
      prototype: prototypeUrl,
      eval: evalUrl,
    },
    scenarios: scenariosOut,
  };

  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(
    `  sources: ${config.sources.length}, scenarios: ${config.scenarios.length}, eval: ${config.views.eval || '(none)'}`
  );
}

main();
