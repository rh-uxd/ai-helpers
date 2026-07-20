'use strict';

const { execSync } = require('child_process');
const path = require('path');

function resolveProjectRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch {
    // scripts/ → skill → skills → plugin → plugins → repo root
    return path.resolve(__dirname, '../../../../../');
  }
}

module.exports = { resolveProjectRoot };
