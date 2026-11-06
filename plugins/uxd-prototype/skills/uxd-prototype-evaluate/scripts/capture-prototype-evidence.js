#!/usr/bin/env node
'use strict';

/**
 * Capture portable visual evidence for a structured evaluator phase.
 *
 * Usage:
 *   node capture-prototype-evidence.js <artifacts-dir> <prototype-url> [--json]
 *
 * The output JSON stores screenshot paths relative to the artifacts directory.
 * The caller may run this script from any working directory.
 */

const fs = require('fs');
const path = require('path');
const { captureTargetedEvidence, DEFAULT_VIEWPORT } = require('./evidence/targeted-evidence');
let chromium;
try {
  ({ chromium } = require('@playwright/test'));
} catch {
  console.error('This skill requires its local Node dependencies. Run npm install in the uxd-prototype-evaluate skill directory.');
  process.exit(1);
}

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const positional = args.filter(arg => !arg.startsWith('--'));
const [artifactsArg, prototypeUrl] = positional;

if (!artifactsArg || !prototypeUrl) {
  console.error('Usage: node capture-prototype-evidence.js <artifacts-dir> <prototype-url> [--json]');
  process.exit(1);
}

function assertSupportedUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid prototype URL: ${rawUrl}`);
  }
  if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported prototype URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

async function main() {
  const artifactsDir = path.resolve(artifactsArg);
  const url = assertSupportedUrl(prototypeUrl);
  const screenshotRelative = 'screenshots/journey-baseline.png';
  const evidencePath = path.join(artifactsDir, 'prototype-evidence.json');
  try {
    fs.lstatSync(evidencePath);
    throw new Error(`Evidence file already exists: ${evidencePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);

    const readState = () => page.evaluate(() => {
      const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
      const visible = element => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const textName = element => clean(
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.getAttribute('placeholder') ||
        element.textContent ||
        element.getAttribute('value')
      ).slice(0, 240);

      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
        .filter(visible)
        .slice(0, 40)
        .map(element => ({
          level: Number(element.tagName.slice(1)),
          text: clean(element.textContent).slice(0, 300),
        }));

      const controls = Array.from(document.querySelectorAll(
        'button,a[href],input,select,textarea,[role="button"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="radio"]'
      ))
        .filter(visible)
        .slice(0, 100)
        .map(element => ({
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute('role') || '',
          name: textName(element),
          href: element.getAttribute('href') || '',
          disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
          expanded: element.getAttribute('aria-expanded') || '',
          selected: element.getAttribute('aria-selected') || '',
        }));

      return {
        title: document.title,
        body_text: clean(document.body && document.body.innerText).slice(0, 16000),
        headings,
        controls,
      };
    });

    const targeted = await captureTargetedEvidence(page, {
      artifactsDir,
      prefix: 'journey-baseline',
      rawRelative: screenshotRelative,
      readState,
      purpose: 'journey',
      maxCrops: 6,
      padding: 16,
    });

    const evidence = {
      schema_version: 1,
      capture_method: 'deterministic-baseline',
      prototype_url: page.url(),
      captured_at: new Date().toISOString(),
      viewport: DEFAULT_VIEWPORT,
      screenshots: [targeted.capture.raw_image.path],
      model_screenshots: targeted.model_screenshots,
      capture: targeted.capture,
      crops: targeted.crops,
      input_metrics: targeted.input_metrics,
      page: targeted.page_state,
    };
    // Keep a prior run's evidence intact; the fixed manifest name is only
    // created when it does not already exist.
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });

    const result = {
      status: 'completed',
      model_invoked: false,
      implementation: path.basename(__filename),
      evidence_file: evidencePath,
      screenshot_count: evidence.screenshots.length,
      screenshot_paths: evidence.screenshots,
      model_screenshot_count: evidence.model_screenshots.length,
      model_screenshot_paths: evidence.model_screenshots,
      crop_count: evidence.crops.length,
      selected_pixel_ratio: evidence.input_metrics.pixel_ratio,
      heading_count: evidence.page.headings.length,
      control_count: evidence.page.controls.length,
    };
    console.log(jsonMode ? JSON.stringify(result) : `Captured ${result.screenshot_count} screenshot to ${evidencePath}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
