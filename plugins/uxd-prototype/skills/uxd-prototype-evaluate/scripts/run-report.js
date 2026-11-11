#!/usr/bin/env node
'use strict';

/**
 * Validate evaluator artifacts, render the HTML report, and validate rendering.
 *
 * Usage: node run-report.js <artifacts-dir> [--json] [--chat]
 *
 * --chat prints the deterministic decision-focused chat synthesis for a
 * canonical run instead of writing HTML. Chat and HTML derive from the same
 * structured synthesis, so they cannot disagree.
 *
 * This runner intentionally does not publish or authenticate. GitLab publishing
 * remains a separate, explicit host action.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const chatMode = args.includes('--chat');
const artifactsArg = args.find(arg => !arg.startsWith('--'));
if (!artifactsArg) {
  console.error('Usage: node run-report.js <artifacts-dir> [--json]');
  process.exit(1);
}

const artifactsDir = path.resolve(artifactsArg);
const required = ['extract-state.json', 'evaluation-report.csv', 'journey-log.json', 'persona-results.json'];

function runBundled(scriptName, extraArgs = []) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, artifactsDir, ...extraArgs], {
    cwd: artifactsDir,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = `${result.stdout || ''}${result.stderr || ''}`.trim().slice(-2000);
    throw new Error(`${scriptName} failed: ${detail}`);
  }
  return result.stdout.trim();
}

function main() {
  if (!fs.existsSync(artifactsDir) || !fs.statSync(artifactsDir).isDirectory()) {
    throw new Error(`Artifacts directory does not exist: ${artifactsDir}`);
  }
  // Any canonical file commits to canonical validation. A partial/invalid run
  // must fail closed instead of rendering stale legacy projections as a fallback.
  if (['pe-context.json', 'pe-evaluation-snapshot.json', 'pe-evidence.json', 'pe-actions.json', 'pe-state.json'].some(name => fs.existsSync(path.join(artifactsDir, name)))) {
    if (chatMode) {
      // All five files plus linked receipts must validate before synthesis.
      const documents = require('./artifacts/split-contract').loadRun(artifactsDir);
      const synthesis = require('./reporting/evaluation-synthesis');
      const markdown = synthesis.chatMarkdown(synthesis.build(documents));
      process.stdout.write(jsonMode ? `${JSON.stringify({ status: 'completed', mode: 'chat', model_invoked: false, chat_markdown: markdown })}\n` : `${markdown}\n`);
      return;
    }
    const result = require('./reporting/canonical-report').render(artifactsDir);
    console.log(jsonMode ? JSON.stringify(result) : `Rendered canonical report: ${result.outputs.evaluation_report}`);
    return;
  }
  if (chatMode) throw new Error('Chat synthesis requires a complete validated canonical run; legacy artifact directories have no shared synthesis');
  const missing = required.filter(name => !fs.existsSync(path.join(artifactsDir, name)));
  if (missing.length > 0) throw new Error(`Missing required artifacts: ${missing.join(', ')}`);

  const started = process.hrtime.bigint();
  // Check old file formats before using the old report template. Modern runs
  // return above and never reach this fallback.
  runBundled('classification/validate-classify.js', ['--json']);
  runBundled('artifacts/validate-artifact-schemas.js', ['--json']);
  runBundled('reporting/render-report.js');
  const renderingValidation = JSON.parse(runBundled('reporting/validate-report-rendering.js', ['--skip-render']));
  const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
  const reportPath = path.join(artifactsDir, 'evaluation-report.html');
  const summaryPath = path.join(artifactsDir, 'evaluation-summary.json');
  const result = {
    status: 'completed',
    implementation: path.basename(__filename),
    model_invoked: false,
    duration_ms: Math.round(durationMs),
    validation_pass_count: renderingValidation.pass_count,
    validation_fail_count: renderingValidation.fail_count,
    outputs: {
      evaluation_report: reportPath,
      evaluation_summary: summaryPath,
    },
  };
  console.log(jsonMode ? JSON.stringify(result) : `Rendered and validated ${reportPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
