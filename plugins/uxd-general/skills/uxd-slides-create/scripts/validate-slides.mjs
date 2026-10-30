#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeck, validateDeck, SLIDES_SPEC_VERSION } from './parse-slides.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(SCRIPT_DIR, '..', 'templates');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const input = args.find((arg) => !arg.startsWith('--'));

if (!input) {
  console.error('Usage: validate-slides.mjs <deck-dir> [--strict]');
  process.exit(2);
}

let deck;
try {
  deck = loadDeck(input);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}

const { errors, warnings } = validateDeck(deck, { templatesDir: TEMPLATES_DIR });
for (const warning of warnings) console.error(`WARNING: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length > 0 || (strict && warnings.length > 0)) process.exit(1);
console.log(`OK: ${deck.slides.length} slide${deck.slides.length === 1 ? '' : 's'} in ${path.resolve(input)} (slides spec ${SLIDES_SPEC_VERSION})`);
