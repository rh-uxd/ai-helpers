#!/usr/bin/env node
/**
 * Batch-export journey steps × page scenarios via Playwright + shared browser serializer.
 *
 * Usage:
 *   node export-journey.mjs \
 *     --base-url http://localhost:3000 \
 *     --journeys .artifacts/ID/journeys.json \
 *     --out .artifacts/ID/exports \
 *     [--scenarios .artifacts/ID/scenarios.json] \
 *     [--formats html,tree] \
 *     [--export-all-if-unset]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSER_BUNDLE = path.resolve(__dirname, '../templates/serialize-page.browser.js');

function parseArgs(argv) {
  const opts = {
    baseUrl: null,
    journeys: null,
    scenarios: null,
    out: null,
    formats: ['html'],
    exportAllIfUnset: false,
    timeout: 30000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-url' && argv[i + 1]) opts.baseUrl = argv[++i];
    else if (a === '--journeys' && argv[i + 1]) opts.journeys = path.resolve(argv[++i]);
    else if (a === '--scenarios' && argv[i + 1]) opts.scenarios = path.resolve(argv[++i]);
    else if (a === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (a === '--formats' && argv[i + 1]) {
      opts.formats = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--export-all-if-unset') opts.exportAllIfUnset = true;
    else if (a === '--timeout' && argv[i + 1]) opts.timeout = Number(argv[++i]);
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function usage() {
  console.log(`Usage: node export-journey.mjs --base-url <url> --journeys <file> --out <dir> [options]

Options:
  --scenarios <file>      scenarios.json (default: sibling of journeys file)
  --formats html,tree     Export formats (default: html)
  --export-all-if-unset   If no step has export:true, export all steps
  --timeout <ms>          Navigation timeout (default: 30000)
`);
}

function joinUrl(base, route) {
  const b = base.replace(/\/+$/, '');
  if (!route || route === '/') return b + '/';
  if (/^https?:\/\//i.test(route)) return route;
  return b + (route.startsWith('/') ? route : `/${route}`);
}

function withScenario(url, scenarioId) {
  const u = new URL(url);
  if (!scenarioId || scenarioId === 'default') {
    u.searchParams.delete('scenario');
  } else {
    u.searchParams.set('scenario', scenarioId);
  }
  return u.toString();
}

function normalizePath(p) {
  if (!p) return '/';
  const noQuery = String(p).split('?')[0].split('#')[0];
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1);
  return noQuery || '/';
}

function loadScenariosByRoute(scenariosPath) {
  const map = new Map();
  if (!scenariosPath || !fs.existsSync(scenariosPath)) return map;
  try {
    const data = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    for (const page of data.pages || []) {
      if (!page || !page.route) continue;
      const key = normalizePath(page.route);
      const list = (page.scenarios || [])
        .filter((s) => s && s.id)
        .map((s) => ({
          id: s.id,
          name: s.name || s.id,
          default: s.default === true || s.id === 'default',
        }));
      if (list.length) map.set(key, list);
    }
  } catch (err) {
    console.warn(`Could not read scenarios file: ${scenariosPath}`, err.message || err);
  }
  return map;
}

function scenariosForRoute(map, route) {
  const key = normalizePath(route || '/');
  const list = map.get(key);
  if (list && list.length) return list;
  return [{ id: 'default', name: 'Default', default: true }];
}

async function runActions(page, actions, timeout) {
  if (!actions || !actions.length) return;
  for (const action of actions) {
    const type = action.type;
    if (type === 'click') {
      await page.locator(action.selector).first().click({ timeout: action.timeout_ms || timeout });
    } else if (type === 'fill') {
      await page.locator(action.selector).first().fill(String(action.value ?? ''), {
        timeout: action.timeout_ms || timeout,
      });
    } else if (type === 'wait_for') {
      await page.locator(action.selector).first().waitFor({
        state: 'visible',
        timeout: action.timeout_ms || timeout,
      });
    } else if (type === 'wait') {
      await new Promise((r) => setTimeout(r, Number(action.ms) || 0));
    } else if (type === 'press') {
      if (action.selector) {
        await page.locator(action.selector).first().press(action.key);
      } else {
        await page.keyboard.press(action.key);
      }
    } else {
      console.warn(`Unknown action type: ${type}`);
    }
  }
}

function shouldExportStep(step, journeyHasExplicitExport, exportAllIfUnset) {
  if (typeof step.export === 'boolean') return step.export;
  if (!journeyHasExplicitExport && exportAllIfUnset) return true;
  return false;
}

function journeyHasExplicit(journey) {
  return (journey.steps || []).some((s) => typeof s.export === 'boolean');
}

async function ensureBundle(page) {
  await page.addScriptTag({ path: BROWSER_BUNDLE });
  await page.waitForFunction(() => window.UxdPrototypeExport && window.UxdPrototypeExport.serializePage);
}

function captureBaseName(stepId, scenarioId) {
  return `${stepId}--${scenarioId}`;
}

async function capture(page, formats, outDir, journeyId, stepId, scenarioId) {
  await ensureBundle(page);
  const dir = path.join(outDir, journeyId);
  fs.mkdirSync(dir, { recursive: true });
  const base = captureBaseName(stepId, scenarioId);
  const written = [];
  const warnings = [];

  if (formats.includes('html')) {
    const result = await page.evaluate(async () => window.UxdPrototypeExport.serializePage({ inlineImages: true }));
    const file = path.join(dir, `${base}.html`);
    fs.writeFileSync(file, result.html, 'utf8');
    written.push(file);
    if (result.warnings && result.warnings.length) warnings.push(...result.warnings);
  }

  if (formats.includes('tree')) {
    const result = await page.evaluate(() => window.UxdPrototypeExport.exportComponentTree({}));
    const jsonFile = path.join(dir, `${base}.tree.json`);
    const txtFile = path.join(dir, `${base}.tree.txt`);
    fs.writeFileSync(jsonFile, JSON.stringify({ source: result.source, tree: result.tree }, null, 2), 'utf8');
    fs.writeFileSync(txtFile, result.text || '', 'utf8');
    written.push(jsonFile, txtFile);
  }

  return { written, warnings };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function writeExportIndex(outDir, summary) {
  // Group: journey → step → scenarios
  const byJourney = new Map();
  for (const row of summary.exports) {
    if (!byJourney.has(row.journey_id)) {
      byJourney.set(row.journey_id, { title: row.journey_title || row.journey_id, steps: new Map() });
    }
    const j = byJourney.get(row.journey_id);
    if (!j.steps.has(row.step_id)) {
      j.steps.set(row.step_id, { name: row.name || row.step_id, scenarios: [] });
    }
    j.steps.get(row.step_id).scenarios.push(row);
  }

  const sections = [];
  for (const [journeyId, journey] of byJourney) {
    const stepBlocks = [];
    for (const [stepId, step] of journey.steps) {
      const items = step.scenarios
        .map((row) => {
          const htmlFile = (row.files || []).find((f) => f.endsWith('.html'));
          const href = htmlFile ? path.relative(outDir, htmlFile).split(path.sep).join('/') : '#';
          const label = row.scenario_name || row.scenario_id || 'default';
          return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a> <code>${escapeHtml(row.scenario_id || 'default')}</code></li>`;
        })
        .join('\n');
      stepBlocks.push(
        `<section class="step"><h3>${escapeHtml(step.name)} <code>${escapeHtml(stepId)}</code></h3><ul>${items}</ul></section>`
      );
    }
    sections.push(
      `<section class="journey"><h2>${escapeHtml(journey.title)} <code>${escapeHtml(journeyId)}</code></h2>${stepBlocks.join('\n')}</section>`
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Prototype exports</title>
  <style>
    body { font-family: "Red Hat Text", "Helvetica Neue", Arial, sans-serif; margin: 2rem; line-height: 1.45; color: #151515; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #d2d2d2; padding-bottom: 0.35rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; }
    code { font-size: 0.85em; color: #6a6e73; }
    ul { padding-left: 1.25rem; }
    a { color: #0066cc; }
    .meta { color: #6a6e73; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Prototype exports</h1>
  <p class="meta">${escapeHtml(summary.exports.length)} capture(s) · ${escapeHtml(summary.base_url || '')} · ${escapeHtml(summary.exported_at || '')}</p>
  ${sections.join('\n') || '<p>No exports.</p>'}
</body>
</html>
`;
  const indexPath = path.join(outDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf8');
  return indexPath;
}

function resolveScenariosPath(opts) {
  if (opts.scenarios) return opts.scenarios;
  if (!opts.journeys) return null;
  const sibling = path.join(path.dirname(opts.journeys), 'scenarios.json');
  if (fs.existsSync(sibling)) return sibling;
  return null;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.baseUrl || !opts.journeys || !opts.out) {
    usage();
    process.exit(opts.help ? 0 : 1);
  }

  if (!fs.existsSync(opts.journeys)) {
    console.error(`Journeys file not found: ${opts.journeys}`);
    process.exit(1);
  }
  if (!fs.existsSync(BROWSER_BUNDLE)) {
    console.error(`Browser bundle missing: ${BROWSER_BUNDLE}`);
    process.exit(1);
  }

  const scenariosPath = resolveScenariosPath(opts);
  const scenariosByRoute = loadScenariosByRoute(scenariosPath);
  if (scenariosPath) {
    console.log(`Scenarios: ${scenariosPath} (${scenariosByRoute.size} page route(s))`);
  } else {
    console.log('Scenarios: none (using default only)');
  }

  const data = JSON.parse(fs.readFileSync(opts.journeys, 'utf8'));
  const journeys = data.journeys || [];
  if (!journeys.length) {
    console.error('No journeys found in file');
    process.exit(1);
  }

  fs.mkdirSync(opts.out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(opts.timeout);

  const summary = {
    exports: [],
    warnings: [],
    base_url: opts.baseUrl,
    scenarios_path: scenariosPath || null,
  };

  try {
    for (const journey of journeys) {
      const explicit = journeyHasExplicit(journey);
      for (const step of journey.steps || []) {
        if (!shouldExportStep(step, explicit, opts.exportAllIfUnset)) continue;

        const scenarios = scenariosForRoute(scenariosByRoute, step.route || '/');
        for (const scenario of scenarios) {
          const baseUrl = joinUrl(opts.baseUrl, step.route || '/');
          const url = withScenario(baseUrl, scenario.id);
          console.log(`Exporting ${journey.id}/${step.id}--${scenario.id} ← ${url}`);
          await page.goto(url, { waitUntil: 'networkidle' }).catch(async () => {
            await page.goto(url, { waitUntil: 'load' });
          });
          await new Promise((r) => setTimeout(r, 300));
          await runActions(page, step.actions, opts.timeout);
          await new Promise((r) => setTimeout(r, 200));

          const { written, warnings } = await capture(
            page,
            opts.formats,
            opts.out,
            journey.id,
            step.id,
            scenario.id
          );
          summary.exports.push({
            journey_id: journey.id,
            journey_title: journey.title || journey.id,
            step_id: step.id,
            name: step.name,
            scenario_id: scenario.id,
            scenario_name: scenario.name,
            url,
            files: written,
          });
          summary.warnings.push(...warnings);
          for (const f of written) console.log(`  → ${f}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  summary.exported_at = new Date().toISOString();
  const indexPath = writeExportIndex(opts.out, summary);
  console.log(`Index: ${indexPath}`);

  const manifestPath = path.join(opts.out, 'export-manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        exports: summary.exports,
        warnings: summary.warnings,
        exported_at: summary.exported_at,
        base_url: summary.base_url,
        scenarios_path: summary.scenarios_path,
        index: indexPath,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Exported ${summary.exports.length} capture(s)`);

  if (!summary.exports.length) {
    console.warn('No steps exported. Mark steps with "export": true or pass --export-all-if-unset.');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
