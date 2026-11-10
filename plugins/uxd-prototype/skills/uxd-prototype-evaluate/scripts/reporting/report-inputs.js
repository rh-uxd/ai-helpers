'use strict';

// Let the old renderer read checked JSON as if it were using the old files.
// Keep those conversions in memory instead of rewriting the saved results.
const fs = require('fs');
const path = require('path');

const { materializeTargets } = require('../artifacts/legacy-artifact-adapter');
const { validateDirectory } = require('../artifacts/validate-canonical-artifacts');

const CANONICAL_FILES = ['pe-context.json', 'pe-evaluation-snapshot.json', 'pe-evidence.json', 'pe-actions.json', 'pe-state.json'];
const REPORT_TARGETS = ['csv', 'summary', 'consistency', 'extract', 'evidence', 'journey', 'actions', 'state'];

function reportError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function loadReportInputs(artifactsDir) {
  const root = path.resolve(artifactsDir);
  const present = CANONICAL_FILES.filter(filename => fs.existsSync(path.join(root, filename)));
  if (!present.length) return { mode: 'legacy', documents: null, virtualFiles: new Map(), imagePaths: [] };
  // If any of the five JSON files exists, require a complete valid set.
  // Do not hide missing files by falling back to old CSV results.
  if (present.length !== CANONICAL_FILES.length) {
    throw reportError('partial_canonical_input', `Canonical report input is incomplete: found ${present.length}/${CANONICAL_FILES.length} files`);
  }
  const validation = validateDirectory(root);
  if (!validation.valid) {
    throw reportError('invalid_canonical_input', `Canonical report input failed validation: ${JSON.stringify(validation.errors)}`);
  }
  const documents = Object.fromEntries(CANONICAL_FILES.map(filename => [
    filename,
    JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8')),
  ]));
  if (documents['pe-evaluation-snapshot.json'].heuristics) {
    // The old template cannot show specialist findings, so stop instead of
    // dropping them. run-report.js uses the newer HTML renderer for these runs.
    throw reportError('heuristic_html_not_supported', 'Legacy HTML projection does not render typed specialist findings. Use the Quick Checks summary/integrity receipt instead.');
  }
  const mapped = materializeTargets(documents, REPORT_TARGETS);
  const virtualFiles = new Map([...mapped].map(([filename, value]) => [
    filename,
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
  ]));
  const evidence = documents['pe-evidence.json'];
  const imagePaths = [
    ...evidence.captures.flatMap(capture => capture.raw_image ? [capture.raw_image.path] : []),
    ...evidence.items.flatMap(item => item.image ? [item.image.path] : []),
  ];
  return {
    mode: 'canonical-v1',
    documents,
    virtualFiles,
    imagePaths: [...new Set(imagePaths)],
  };
}

module.exports = { CANONICAL_FILES, loadReportInputs };
