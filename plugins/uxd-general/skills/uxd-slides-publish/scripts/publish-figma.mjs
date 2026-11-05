#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyAsset,
  loadDeck,
  partitionBeat,
  plainText,
  slidePlainText,
  validateDeck
} from '../../uxd-slides-create/scripts/parse-slides.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(SCRIPT_DIR, '..', '..', 'uxd-slides-create', 'templates');

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') options.out = argv[++index];
    else if (arg === '--file-key') options.fileKey = argv[++index];
    else if (arg === '--file-url') options.fileUrl = argv[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    else positional.push(arg);
  }
  options.input = positional[0];
  return options;
}

export function fileKeyFromSlidesUrl(url) {
  const match = String(url || '').match(/figma\.com\/slides\/([A-Za-z0-9]+)/);
  return match ? match[1] : '';
}

function slidePlan(deck, slide) {
  const image = slide.media?.src || '';
  const local = image && classifyAsset(image) === 'local';
  const entry = {
    index: slide.order,
    template: slide.type,
    kicker: slide.kicker || '',
    heading: plainText(slide.heading),
    subheading: plainText(slide.subheading),
    body: slidePlainText({ ...slide, media: null }),
    notes: slide.notes || '',
    image,
    imagePath: local ? path.resolve(deck.dir, image) : ''
  };
  if (slide.type === 'beat') {
    const parts = partitionBeat(slide);
    entry.story = slidePlainText({ blocks: parts.story });
    entry.rail = parts.rail.map((group) => ({
      label: plainText(group.label),
      kind: group.kind,
      items: group.items.map((item) => plainText(item))
    }));
  }
  return entry;
}

export function planFigmaPublish(deck, { fileKey, fileUrl } = {}) {
  const canonical = deck.metadata.canonical && typeof deck.metadata.canonical === 'object'
    ? deck.metadata.canonical
    : {};
  const canonicalUrl = canonical.target === 'figma-slides' ? String(canonical.url || '') : '';
  const resolvedKey = fileKey || fileKeyFromSlidesUrl(fileUrl) || fileKeyFromSlidesUrl(canonicalUrl);
  const slides = deck.slides.map((slide) => slidePlan(deck, slide));
  return {
    title: deck.metadata.title,
    description: deck.metadata.description || '',
    aspectRatio: deck.metadata.aspectRatio || '16:9',
    slideCount: slides.length,
    fileKey: resolvedKey || null,
    canonicalUrl: canonicalUrl || null,
    action: resolvedKey ? 'update' : 'create',
    slides
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.input) {
    console.log('Usage: publish-figma.mjs <slides-dir> [--out <file>] [--file-key <key>] [--file-url <https://www.figma.com/slides/...>]');
    process.exit(options.help ? 0 : 2);
  }
  const deck = loadDeck(options.input);
  const report = validateDeck(deck, { templatesDir: TEMPLATES_DIR });
  for (const warning of report.warnings) console.error(`WARNING: ${warning}`);
  if (report.errors.length > 0) throw new Error(report.errors.join('\n'));
  const plan = planFigmaPublish(deck, options);
  const images = plan.slides.filter((slide) => slide.imagePath);
  console.log(`title: ${plan.title}`);
  console.log(`slides: ${plan.slideCount}`);
  console.log('mode: plan');
  console.log(`action: ${plan.action}`);
  console.log(`file: ${plan.fileKey || 'new'}`);
  if (images.length > 0) {
    console.log('images:');
    images.forEach((slide) => console.log(`- ${slide.image}`));
  }
  console.log('This plan does not write a Figma file. Build the Slides file from it, then record the URL.');
  const json = `${JSON.stringify(plan, null, 2)}\n`;
  if (options.out) fs.writeFileSync(options.out, json);
  else process.stdout.write(json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}
