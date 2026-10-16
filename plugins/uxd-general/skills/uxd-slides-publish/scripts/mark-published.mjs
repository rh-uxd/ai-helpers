#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGETS = new Set(['google-slides', 'figma-slides']);
const URL_RULES = {
  'google-slides': /^https:\/\/docs\.google\.com\/presentation\/d\/[^/]+/,
  'figma-slides': /^https:\/\/(?:www\.)?figma\.com\/slides\//
};

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--target') options.target = argv[++index];
    else if (arg === '--url') options.url = argv[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    else positional.push(arg);
  }
  options.input = positional[0];
  return options;
}

export function markPublished(dir, { target, url, publishedAt = new Date().toISOString() } = {}) {
  if (!TARGETS.has(target)) throw new Error('target must be google-slides or figma-slides.');
  if (!URL_RULES[target].test(url || '')) {
    throw new Error(`url does not look like a ${target} link.`);
  }
  const deckDir = path.resolve(dir);
  const metaPath = path.join(deckDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) throw new Error(`No metadata.json in ${deckDir}`);
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  metadata.status = 'published';
  metadata.updatedAt = publishedAt;
  metadata.canonical = { target, url, publishedAt };
  fs.writeFileSync(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);
  return metadata;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.input || !options.target || !options.url) {
    console.log('Usage: mark-published.mjs <slides-dir> --target google-slides|figma-slides --url <https-url>');
    process.exit(options.help ? 0 : 2);
  }
  const metadata = markPublished(options.input, options);
  console.log(`Marked ${path.resolve(options.input)} as published.`);
  console.log(metadata.canonical.url);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}
