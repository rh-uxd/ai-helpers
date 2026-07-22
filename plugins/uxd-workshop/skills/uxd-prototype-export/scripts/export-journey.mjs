#!/usr/bin/env node
/**
 * Batch-export journey steps via Playwright + shared browser serializer.
 *
 * Usage:
 *   node export-journey.mjs \
 *     --base-url http://localhost:3000 \
 *     --journeys .artifacts/ID/journeys.json \
 *     --out .artifacts/ID/exports \
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
    out: null,
    formats: ['html'],
    exportAllIfUnset: false,
    timeout: 30000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-url' && argv[i + 1]) opts.baseUrl = argv[++i];
    else if (a === '--journeys' && argv[i + 1]) opts.journeys = path.resolve(argv[++i]);
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

async function capture(page, formats, outDir, journeyId, stepId) {
  await ensureBundle(page);
  const dir = path.join(outDir, journeyId);
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  const warnings = [];

  if (formats.includes('html')) {
    const result = await page.evaluate(async () => window.UxdPrototypeExport.serializePage({ inlineImages: true }));
    const file = path.join(dir, `${stepId}.html`);
    fs.writeFileSync(file, result.html, 'utf8');
    written.push(file);
    if (result.warnings && result.warnings.length) warnings.push(...result.warnings);
  }

  if (formats.includes('tree')) {
    const result = await page.evaluate(() => window.UxdPrototypeExport.exportComponentTree({}));
    const jsonFile = path.join(dir, `${stepId}.tree.json`);
    const txtFile = path.join(dir, `${stepId}.tree.txt`);
    fs.writeFileSync(jsonFile, JSON.stringify({ source: result.source, tree: result.tree }, null, 2), 'utf8');
    fs.writeFileSync(txtFile, result.text || '', 'utf8');
    written.push(jsonFile, txtFile);
  }

  return { written, warnings };
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

  const summary = { exports: [], warnings: [] };

  try {
    for (const journey of journeys) {
      const explicit = journeyHasExplicit(journey);
      for (const step of journey.steps || []) {
        if (!shouldExportStep(step, explicit, opts.exportAllIfUnset)) continue;

        const url = joinUrl(opts.baseUrl, step.route || '/');
        console.log(`Exporting ${journey.id}/${step.id} ← ${url}`);
        await page.goto(url, { waitUntil: 'networkidle' }).catch(async () => {
          await page.goto(url, { waitUntil: 'load' });
        });
        await new Promise((r) => setTimeout(r, 300));
        await runActions(page, step.actions, opts.timeout);
        await new Promise((r) => setTimeout(r, 200));

        const { written, warnings } = await capture(page, opts.formats, opts.out, journey.id, step.id);
        summary.exports.push({
          journey_id: journey.id,
          step_id: step.id,
          name: step.name,
          url,
          files: written,
        });
        summary.warnings.push(...warnings);
        for (const f of written) console.log(`  → ${f}`);
      }
    }
  } finally {
    await browser.close();
  }

  const manifestPath = path.join(opts.out, 'export-manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ ...summary, exported_at: new Date().toISOString(), base_url: opts.baseUrl }, null, 2),
    'utf8'
  );
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Exported ${summary.exports.length} step(s)`);

  if (!summary.exports.length) {
    console.warn('No steps exported. Mark steps with "export": true or pass --export-all-if-unset.');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
