#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { itemDepth, loadDeck, partitionBeat, plainText, slidePlainText, validateDeck } from '../../uxd-slides-create/scripts/parse-slides.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(SCRIPT_DIR, '..', '..', 'uxd-slides-create', 'templates');

const EMU = 914400;
const PAGE_W = 10 * EMU;
const PAGE_H = 5.625 * EMU;

function inches(value) {
  return Math.round(value * EMU);
}

function parseArgs(argv) {
  const options = { apply: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg === '--presentation-id') options.presentationId = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    else positional.push(arg);
  }
  options.input = positional[0];
  return options;
}

function rgb(red, green, blue) {
  return { red, green, blue };
}

const DARK = rgb(0.082, 0.082, 0.082);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.8, 0.8, 0.8);
const INK = rgb(0.082, 0.082, 0.082);
const QUIET = rgb(0.416, 0.431, 0.451);

function box({ pageId, objectId, x, y, w, h, text, fontSize, color, bold = false, align = 'START' }) {
  if (!text) return [];
  return [
    {
      createShape: {
        objectId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: pageId,
          size: {
            width: { magnitude: w, unit: 'EMU' },
            height: { magnitude: h, unit: 'EMU' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: 'EMU'
          }
        }
      }
    },
    {
      updateShapeProperties: {
        objectId,
        shapeProperties: { shapeBackgroundFill: { propertyState: 'NOT_RENDERED' } },
        fields: 'shapeBackgroundFill'
      }
    },
    { insertText: { objectId, text, insertionIndex: 0 } },
    {
      updateTextStyle: {
        objectId,
        textRange: { type: 'ALL' },
        style: {
          fontFamily: 'Arial',
          fontSize: { magnitude: fontSize, unit: 'PT' },
          foregroundColor: { opaqueColor: { rgbColor: color } },
          bold
        },
        fields: 'fontFamily,fontSize,foregroundColor,bold'
      }
    },
    {
      updateParagraphStyle: {
        objectId,
        textRange: { type: 'ALL' },
        style: { alignment: align },
        fields: 'alignment'
      }
    }
  ];
}

function slideBackground(pageId, color) {
  return {
    updatePageProperties: {
      objectId: pageId,
      pageProperties: {
        pageBackgroundFill: { solidFill: { color: { rgbColor: color } } }
      },
      fields: 'pageBackgroundFill'
    }
  };
}

export function buildSlideRequests(deck, { stamp = 'local' } = {}) {
  const groups = [];
  const imageNotes = [];
  deck.slides.forEach((slide, index) => {
    const pageId = `uxd_${stamp}_${String(index).padStart(2, '0')}`;
    const dark = slide.type === 'title' || slide.type === 'section' || slide.type === 'closing';
    const requests = [
      {
        createSlide: {
          objectId: pageId,
          insertionIndex: index,
          slideLayoutReference: { predefinedLayout: 'BLANK' }
        }
      },
      slideBackground(pageId, dark ? DARK : WHITE)
    ];
    const textColor = dark ? WHITE : INK;
    const subColor = dark ? MUTED : QUIET;
    const width = PAGE_W - inches(1.4);

    if (slide.type === 'section') {
      requests.push(...box({
        pageId,
        objectId: `${pageId}_h`,
        x: inches(0.7),
        y: inches(1.8),
        w: width,
        h: inches(2),
        text: plainText(slide.heading),
        fontSize: 40,
        color: textColor,
        bold: true
      }));
    } else if (slide.type === 'quote') {
      const quote = slide.blocks.find((block) => block.type === 'quote');
      requests.push(...box({
        pageId,
        objectId: `${pageId}_h`,
        x: inches(0.7),
        y: inches(1.4),
        w: width,
        h: inches(2.2),
        text: plainText(quote ? quote.text : slide.heading),
        fontSize: 28,
        color: textColor
      }));
      if (quote && slide.heading) {
        requests.push(...box({
          pageId,
          objectId: `${pageId}_s`,
          x: inches(0.7),
          y: inches(3.8),
          w: width,
          h: inches(0.6),
          text: plainText(slide.heading),
          fontSize: 16,
          color: subColor
        }));
      }
    } else if (slide.type === 'title' || slide.type === 'closing') {
      requests.push(...box({
        pageId,
        objectId: `${pageId}_h`,
        x: inches(0.7),
        y: inches(2.3),
        w: width,
        h: inches(1.5),
        text: plainText(slide.heading),
        fontSize: 36,
        color: textColor,
        bold: true
      }));
      requests.push(...box({
        pageId,
        objectId: `${pageId}_s`,
        x: inches(0.7),
        y: inches(4),
        w: width,
        h: inches(0.8),
        text: plainText(slide.subheading),
        fontSize: 18,
        color: subColor
      }));
    } else if (slide.type === 'beat') {
      const parts = partitionBeat(slide);
      const story = [slide.kicker, plainText(slide.heading), slidePlainText({ blocks: parts.story })]
        .filter(Boolean)
        .join('\n\n');
      const rail = parts.rail
        .map((group) => [group.label, ...group.items.map((item) => `${itemDepth(item) ? '  ◦' : '•'} ${plainText(item)}`)].join('\n'))
        .join('\n\n');
      requests.push(...box({
        pageId,
        objectId: `${pageId}_h`,
        x: inches(0.45),
        y: inches(0.35),
        w: inches(5.4),
        h: slide.media?.src ? inches(3.15) : inches(4.9),
        text: story,
        fontSize: 14,
        color: textColor
      }));
      if (slide.media?.src) {
        imageNotes.push(slide.media.src);
        requests.push(...box({
          pageId,
          objectId: `${pageId}_m`,
          x: inches(0.45),
          y: inches(3.6),
          w: inches(5.4),
          h: inches(1.6),
          text: `Concept sketch stays in the local deck:\n${slide.media.src}`,
          fontSize: 14,
          color: QUIET
        }));
      }
      requests.push(...box({
        pageId,
        objectId: `${pageId}_r`,
        x: inches(6.05),
        y: inches(0.35),
        w: inches(3.5),
        h: inches(4.9),
        text: rail,
        fontSize: 12,
        color: textColor
      }));
    } else {
      const bodyWidth = slide.type === 'split' ? inches(4.6) : width;
      requests.push(...box({
        pageId,
        objectId: `${pageId}_h`,
        x: inches(0.7),
        y: inches(0.4),
        w: bodyWidth,
        h: inches(1.15),
        text: plainText(slide.kicker ? `${slide.kicker}\n${slide.heading}` : slide.heading),
        fontSize: 26,
        color: textColor,
        bold: true
      }));
      requests.push(...box({
        pageId,
        objectId: `${pageId}_b`,
        x: inches(0.7),
        y: inches(1.7),
        w: bodyWidth,
        h: inches(3.4),
        text: slidePlainText({ ...slide, media: null }),
        fontSize: 16,
        color: textColor
      }));
      if (slide.media?.src) {
        imageNotes.push(slide.media.src);
        requests.push(...box({
          pageId,
          objectId: `${pageId}_m`,
          x: inches(5.6),
          y: inches(1.7),
          w: inches(3.7),
          h: inches(2.4),
          text: `Image stays in the local deck:\n${slide.media.src}`,
          fontSize: 14,
          color: QUIET
        }));
      }
    }
    groups.push(requests);
  });
  return { groups, imageNotes, page: { width: PAGE_W, height: PAGE_H } };
}

function flattenGroups(groups) {
  return groups.flat();
}

function chunkRequests(requests, maxChars = 100000) {
  const chunks = [];
  let current = [];
  for (const request of requests) {
    const candidate = current.concat(request);
    if (JSON.stringify(candidate).length > maxChars && current.length > 0) {
      chunks.push(current);
      current = [request];
    } else current = candidate;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function gws(args) {
  const result = spawnSync('gws', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw new Error(`Could not run gws: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || `gws exited ${result.status}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`gws did not return JSON:\n${result.stdout.slice(0, 500)}`);
  }
}

export function presentationIdFromInput(value) {
  const text = String(value || '').trim();
  const match = text.match(/\/presentation\/d\/([^/?#]+)/);
  return match ? match[1] : text;
}

function presentationUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/edit`;
}

function notesRequests(presentation, deck) {
  const requests = [];
  const slides = presentation.slides || [];
  deck.slides.forEach((slide, index) => {
    if (!slide.notes) return;
    const elements = slides[index]?.slideProperties?.notesPage?.pageElements || [];
    const body = elements.find((element) => element.shape?.placeholder?.type === 'BODY');
    if (!body?.objectId) return;
    requests.push({
      insertText: { objectId: body.objectId, text: slide.notes, insertionIndex: 0 }
    });
  });
  return requests;
}

export function planGooglePublish(deck, { presentationId, stamp } = {}) {
  const built = buildSlideRequests(deck, { stamp: stamp || Date.now().toString(36) });
  return {
    title: deck.metadata.title,
    presentationId: presentationId || null,
    slideCount: deck.slides.length,
    imageNotes: built.imageNotes,
    groups: built.groups
  };
}

function applyPlan(deck, plan) {
  let presentationId = plan.presentationId;
  let existingIds = [];
  if (presentationId) {
    const existing = gws(['slides', 'presentations', 'get', '--params', JSON.stringify({ presentationId })]);
    existingIds = (existing.slides || []).map((slide) => slide.objectId);
  } else {
    const created = gws(['slides', 'presentations', 'create', '--json', JSON.stringify({ title: plan.title })]);
    presentationId = created.presentationId;
    existingIds = (created.slides || []).map((slide) => slide.objectId);
  }
  if (!presentationId) throw new Error('Google Slides did not return a presentation id.');

  const createAndDelete = [
    ...plan.groups.map((group) => group[0]),
    ...existingIds.map((objectId) => ({ deleteObject: { objectId } }))
  ];
  const content = plan.groups.flatMap((group) => group.slice(1));
  for (const requests of chunkRequests([...createAndDelete, ...content])) {
    gws([
      'slides',
      'presentations',
      'batchUpdate',
      '--params',
      JSON.stringify({ presentationId }),
      '--json',
      JSON.stringify({ requests })
    ]);
  }

  const fresh = gws(['slides', 'presentations', 'get', '--params', JSON.stringify({ presentationId })]);
  const notes = notesRequests(fresh, deck);
  if (notes.length > 0) {
    gws([
      'slides',
      'presentations',
      'batchUpdate',
      '--params',
      JSON.stringify({ presentationId }),
      '--json',
      JSON.stringify({ requests: notes })
    ]);
  }
  return presentationUrl(presentationId);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.input) {
    console.log('Usage: publish-google.mjs <slides-dir> [--dry-run] [--apply] [--presentation-id <id>] [--out <file>]');
    process.exit(options.help ? 0 : 2);
  }
  if (options.presentationId) options.presentationId = presentationIdFromInput(options.presentationId);
  const deck = loadDeck(options.input);
  const report = validateDeck(deck, { templatesDir: TEMPLATES_DIR });
  for (const warning of report.warnings) console.error(`WARNING: ${warning}`);
  if (report.errors.length > 0) throw new Error(report.errors.join('\n'));
  const plan = planGooglePublish(deck, { presentationId: options.presentationId });
  const requests = flattenGroups(plan.groups);
  if (options.out) fs.writeFileSync(options.out, `${JSON.stringify(requests, null, 2)}\n`);
  console.log(`title: ${plan.title}`);
  console.log(`slides: ${plan.slideCount}`);
  console.log(`mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log(`presentation: ${plan.presentationId || 'new'}`);
  console.log(`requests: ${requests.length}`);
  if (plan.imageNotes.length > 0) {
    console.log('images stay in the local deck:');
    plan.imageNotes.forEach((src) => console.log(`- ${src}`));
  }
  if (!options.apply) {
    console.log('No Google Slides request was sent.');
    return;
  }
  const url = applyPlan(deck, plan);
  console.log(`url: ${url}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}
