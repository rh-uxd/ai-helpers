#!/usr/bin/env node
'use strict';

/**
 * Validate evaluator artifacts, render the HTML report, and validate rendering.
 *
 * Usage: node run-report.js <artifacts-dir> [--json] [--chat]
 *
 * Requires the five canonical JSON files and their linked receipts.
 * --chat prints the deterministic decision-focused chat synthesis for a
 * canonical run instead of writing HTML. Chat and HTML derive from the same
 * structured synthesis, so they cannot disagree.
 *
 * This runner intentionally does not publish or authenticate. GitLab publishing
 * remains a separate, explicit host action.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const chatMode = args.includes('--chat');
const artifactsArg = args.find(arg => !arg.startsWith('--'));
if (!artifactsArg) {
  console.error('Usage: node run-report.js <artifacts-dir> [--json] [--chat]');
  process.exit(1);
}

const artifactsDir = path.resolve(artifactsArg);

function main() {
  if (!fs.existsSync(artifactsDir) || !fs.statSync(artifactsDir).isDirectory()) {
    throw new Error(`Artifacts directory does not exist: ${artifactsDir}`);
  }
  // All five canonical documents and linked receipts are required. Old CSV or
  // HTML files cannot fill gaps or bypass validation.
  if (chatMode) {
    const documents = require('./artifacts/split-contract').loadRun(artifactsDir);
    const synthesis = require('./reporting/evaluation-synthesis');
    const markdown = synthesis.chatMarkdown(synthesis.build(documents));
    process.stdout.write(jsonMode ? `${JSON.stringify({ status: 'completed', mode: 'chat', model_invoked: false, chat_markdown: markdown })}\n` : `${markdown}\n`);
    return;
  }
  const result = require('./reporting/canonical-report').render(artifactsDir);
  console.log(jsonMode ? JSON.stringify(result) : `Rendered canonical report: ${result.outputs.evaluation_report}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
