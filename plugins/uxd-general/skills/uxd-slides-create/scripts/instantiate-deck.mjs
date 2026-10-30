#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDeckTemplates, SLIDES_SPEC_VERSION } from './parse-slides.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(SCRIPT_DIR, '..', 'templates');

function parseArgs(argv) {
  const positional = [];
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    positional.push(arg);
  }
  return { template: positional[0], output: positional[1] };
}

export function instantiateDeck(templateName, outputDir, { templatesDir = TEMPLATES_DIR } = {}) {
  const known = listDeckTemplates(templatesDir);
  const source = path.join(templatesDir, 'decks', templateName);
  if (!known.includes(templateName) || !fs.existsSync(path.join(source, 'slides'))) {
    throw new Error(`Unknown deck template "${templateName}". Known deck templates: ${known.join(', ') || 'none'}.`);
  }
  const dest = path.resolve(outputDir);
  if (fs.existsSync(path.join(dest, 'metadata.json')) || fs.existsSync(path.join(dest, 'slides'))) {
    throw new Error(`Refusing to overwrite ${dest}.`);
  }
  const themePath = path.join(templatesDir, 'theme', 'default.css');
  if (!fs.existsSync(themePath)) throw new Error(`Missing ${themePath}.`);

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(path.join(source, 'slides'), path.join(dest, 'slides'), { recursive: true });
  const metadata = JSON.parse(fs.readFileSync(path.join(source, 'metadata.json'), 'utf8'));
  metadata.specVersion = SLIDES_SPEC_VERSION;
  fs.writeFileSync(path.join(dest, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  const theme = fs.readFileSync(themePath, 'utf8').trim();
  const extraPath = path.join(source, 'theme.css');
  const extra = fs.existsSync(extraPath) ? fs.readFileSync(extraPath, 'utf8').trim() : '';
  fs.mkdirSync(path.join(dest, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'assets', 'default.css'), extra ? `${theme}\n\n${extra}\n` : `${theme}\n`);
  return dest;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.template || !options.output) {
    console.log('Usage: instantiate-deck.mjs <deck-template> <output-dir>');
    process.exit(options.help ? 0 : 2);
  }
  const dest = instantiateDeck(options.template, options.output);
  console.log(`Created ${dest} from ${options.template} (slides spec ${SLIDES_SPEC_VERSION})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}
