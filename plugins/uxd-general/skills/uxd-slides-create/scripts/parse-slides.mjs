#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPECIFICATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', 'specifications', 'slides');
const CURRENT_SPEC = JSON.parse(fs.readFileSync(path.join(SPECIFICATIONS_DIR, 'current.json'), 'utf8'));

export const SLIDES_SPEC_VERSION = String(CURRENT_SPEC.version || '');
export const SLIDES_SPEC_VERSIONS = Array.isArray(CURRENT_SPEC.versions) ? CURRENT_SPEC.versions.map(String) : [SLIDES_SPEC_VERSION];

export const SLIDE_TYPES = ['title', 'section', 'content', 'split', 'quote', 'closing', 'beat', 'agenda', 'persona', 'stages', 'scene', 'compare'];

const BEAT_RAILS = [
  { kind: 'users', label: 'Users', pattern: /^(users|people)\b/i },
  { kind: 'needs', label: 'Unmet needs', pattern: /^(unmet needs|needs)\b/i },
  { kind: 'solutions', label: 'Solutions', pattern: /^solutions?\b/i }
];

export const PUBLISH_TARGETS = ['google-slides', 'figma-slides'];

const TYPE_RE = /^type:\s*([a-z][\w-]*)\s*$/i;
const IMAGE_RE = /^image:\s*(\S.*?)\s*$/i;
const KICKER_RE = /^kicker:\s*(\S.*?)\s*$/i;
const NOTES_RE = /^notes:?\s*([\s\S]*)$/i;

export function parseSlidesMarkdown(markdown) {
  const normalized = String(markdown).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const chunks = normalized.split(/^\s*---\s*$/m).map((chunk) => chunk.trim()).filter(Boolean);

  return chunks.map((chunk, index) => {
    const comments = [];
    const body = chunk.replace(/<!--([\s\S]*?)-->/g, (_, inner) => {
      comments.push(inner.trim());
      return '';
    });
    const slide = {
      index,
      type: '',
      inferredType: false,
      kicker: '',
      heading: '',
      subheading: '',
      blocks: [],
      media: null,
      notes: '',
      warnings: []
    };

    for (const comment of comments) {
      const typeMatch = comment.match(TYPE_RE);
      const imageMatch = comment.match(IMAGE_RE);
      const kickerMatch = comment.match(KICKER_RE);
      const notesMatch = comment.match(NOTES_RE);
      if (typeMatch) slide.type = typeMatch[1].toLowerCase();
      else if (imageMatch) slide.media = { type: 'image', src: imageMatch[1].trim() };
      else if (kickerMatch) slide.kicker = kickerMatch[1].trim();
      else if (notesMatch) {
        const notes = notesMatch[1].trim();
        slide.notes = slide.notes ? `${slide.notes}\n${notes}` : notes;
      } else if (/^iframe:/i.test(comment)) {
        slide.warnings.push('iframe directives are not rendered; use an image in assets/');
      }
    }

    Object.assign(slide, parseBody(body), { type: slide.type, notes: slide.notes, media: slide.media, kicker: slide.kicker || '' });

    if (!slide.type) {
      const titleLike = slide.heading && slide.blocks.length === 0;
      slide.type = titleLike ? 'title' : 'content';
      slide.inferredType = true;
    }

    return slide;
  });
}

function parseBody(body) {
  const result = { heading: '', subheading: '', blocks: [] };
  const lines = body.split('\n');
  let bullets = null;
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      bullets = null;
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      result.blocks.push({ type: 'code', text: code.join('\n') });
      bullets = null;
      continue;
    }

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      const text = trimmed.slice(2).trim();
      if (!result.heading) result.heading = text;
      else result.blocks.push({ type: 'paragraph', text });
    } else if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      const text = trimmed.slice(3).trim();
      if (!result.subheading) result.subheading = text;
      else result.blocks.push({ type: 'h3', text });
    } else if (trimmed.startsWith('#### ')) {
      result.blocks.push({ type: 'h4', text: trimmed.slice(5).trim() });
      bullets = null;
    } else if (trimmed.startsWith('### ')) {
      result.blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
      bullets = null;
    } else if (/^\s*[-*] +.+$/.test(lines[index])) {
      const bulletLine = lines[index].match(/^(\s*)[-*] +(.*)$/);
      const depth = bulletLine[1].replace(/\t/g, '  ').length >= 2 ? 1 : 0;
      const text = bulletLine[2].trim();
      if (!bullets) {
        bullets = { type: 'bullets', items: [] };
        result.blocks.push(bullets);
      }
      bullets.items.push(depth ? { text, depth } : text);
    } else if (trimmed.startsWith('> ')) {
      result.blocks.push({ type: 'quote', text: trimmed.slice(2).trim() });
      bullets = null;
    } else if (trimmed.startsWith('![')) {
      const image = trimmed.match(/^!\[(.*?)\]\((.+?)\)$/);
      if (image) result.blocks.push({ type: 'image', alt: image[1], src: image[2].trim() });
      else result.blocks.push({ type: 'paragraph', text: trimmed });
      bullets = null;
    } else if (trimmed.startsWith('|')) {
      result.blocks.push({ type: 'paragraph', text: trimmed });
      bullets = null;
    } else {
      result.blocks.push({ type: 'paragraph', text: trimmed });
      bullets = null;
    }
    index += 1;
  }

  return result;
}

export function partitionBeat(slide) {
  const story = [];
  const rail = [];
  let current = null;

  for (const block of slide.blocks || []) {
    if (block.type === 'h3') {
      const kind = beatRailKind(block.text);
      if (kind) {
        current = { kind, label: block.text, items: [] };
        rail.push(current);
        continue;
      }
      current = null;
    }
    if (current && block.type === 'bullets') {
      current.items.push(...block.items);
      continue;
    }
    if (current && (block.type === 'paragraph' || block.type === 'quote')) {
      current.items.push(block.text);
      continue;
    }
    current = null;
    story.push(block);
  }

  return { story, rail };
}

function beatRailKind(label) {
  const text = String(label || '').trim();
  const match = BEAT_RAILS.find((entry) => entry.pattern.test(text));
  return match ? match.kind : '';
}

export function assetRefs(slide) {
  const refs = [];
  if (slide.media?.src) refs.push(slide.media.src);
  for (const block of slide.blocks) {
    if (block.type === 'image' && block.src) refs.push(block.src);
  }
  return refs;
}

export function classifyAsset(src) {
  const value = String(src || '').trim();
  if (!value) return 'empty';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return 'remote';
  if (value.startsWith('/') || value.startsWith('\\')) return 'absolute';
  const normalized = path.posix.normalize(value.replace(/\\/g, '/'));
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) return 'escape';
  return 'local';
}

function listNamedDirs(parent) {
  if (!parent || !fs.existsSync(parent)) return [];
  return fs.readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function listDeckTemplates(templatesDir) {
  return listNamedDirs(templatesDir && path.join(templatesDir, 'decks'));
}

export function listSlideTemplates(templatesDir) {
  return listNamedDirs(templatesDir && path.join(templatesDir, 'slides'));
}

export function listTemplates(templatesDir) {
  return listDeckTemplates(templatesDir);
}

function readObject(file, label) {
  let loaded;
  try {
    loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Could not parse ${label}.`);
  }
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new Error(`${label} must be an object.`);
  }
  return loaded;
}

function loadSlide(deckDir, orderName) {
  const slideDir = path.join(deckDir, 'slides', orderName);
  const contentPath = path.join(slideDir, 'content.md');
  const notesPath = path.join(slideDir, 'speaker-notes.md');
  const metaPath = path.join(slideDir, 'metadata.json');
  const cssPath = path.join(slideDir, 'custom.css');
  if (!fs.existsSync(contentPath)) throw new Error(`Slide ${orderName} is missing content.md.`);
  if (!fs.existsSync(metaPath)) throw new Error(`Slide ${orderName} is missing metadata.json.`);
  const rawContent = fs.readFileSync(contentPath, 'utf8');
  const meta = readObject(metaPath, `slides/${orderName}/metadata.json`);
  const notesMissing = !fs.existsSync(notesPath);
  const parsed = parseBody(rawContent);
  const image = String(meta.image || '').trim();
  return {
    order: Number(orderName),
    type: String(meta.template || '').trim().toLowerCase(),
    inferredType: false,
    kicker: String(meta.kicker || '').trim(),
    heading: parsed.heading,
    subheading: parsed.subheading,
    blocks: parsed.blocks,
    media: image ? { type: 'image', src: image } : null,
    notes: notesMissing ? '' : fs.readFileSync(notesPath, 'utf8').trim(),
    notesMissing,
    customCss: fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '',
    rawContent,
    warnings: []
  };
}

export function loadDeck(dir) {
  const deckDir = path.resolve(dir);
  const slidesDir = path.join(deckDir, 'slides');
  if (!fs.existsSync(slidesDir) || !fs.statSync(slidesDir).isDirectory()) {
    throw new Error(`No slides directory in ${deckDir}`);
  }
  const entries = fs.readdirSync(slidesDir, { withFileTypes: true });
  const ignoredSlideFolders = entries
    .filter((entry) => entry.isDirectory() && !/^[1-9]\d*$/.test(entry.name))
    .map((entry) => entry.name);
  const slides = entries
    .filter((entry) => entry.isDirectory() && /^[1-9]\d*$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => Number(left) - Number(right))
    .map((name) => loadSlide(deckDir, name));
  slides.forEach((slide, index) => { slide.index = index; });

  let metadata = {
    title: path.basename(deckDir),
    description: '',
    template: 'briefing',
    specVersion: '',
    aspectRatio: '16:9',
    status: 'draft',
    createdAt: '',
    updatedAt: ''
  };
  const metaPath = path.join(deckDir, 'metadata.json');
  let metadataPresent = false;
  if (fs.existsSync(metaPath)) {
    metadataPresent = true;
    metadata = { ...metadata, ...readObject(metaPath, 'metadata.json') };
  }
  return {
    dir: deckDir,
    slides,
    text: slides.map((slide) => `${slide.rawContent}\n${slide.notes}`).join('\n'),
    metadata,
    metadataPresent,
    metaPath,
    slidesDir,
    ignoredSlideFolders
  };
}

function validateContributors(metadata, field, errors) {
  if (metadata[field] == null) return;
  if (!Array.isArray(metadata[field])) {
    errors.push(`metadata.${field} must be a list.`);
    return;
  }
  metadata[field].forEach((entry, index) => {
    const label = `metadata.${field}[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label} must be an object with an id.`);
      return;
    }
    if (!String(entry.id || '').trim()) errors.push(`${label}.id is required.`);
    if (entry.description != null && typeof entry.description !== 'string') {
      errors.push(`${label}.description must be a string.`);
    }
  });
}

export function validateDeck(deck, { templatesDir } = {}) {
  const errors = [];
  const warnings = [];
  const { metadata, slides, text, dir, metadataPresent, ignoredSlideFolders = [] } = deck;

  if (!metadataPresent) errors.push('metadata.json is missing.');
  for (const field of ['title', 'description', 'template', 'createdAt', 'updatedAt']) {
    if (!metadata[field] || !String(metadata[field]).trim()) errors.push(`metadata.${field} is required.`);
  }
  const specVersion = String(metadata.specVersion || '').trim();
  if (!/^\d+\.\d+\.\d+$/.test(specVersion)) {
    errors.push('metadata.specVersion must be the slides spec version, for example 0.1.0.');
  } else if (specVersion !== SLIDES_SPEC_VERSION && SLIDES_SPEC_VERSIONS.includes(specVersion)) {
    errors.push(`metadata.specVersion is ${specVersion}. Current slides spec is ${SLIDES_SPEC_VERSION}. Upgrade with specifications/slides/upgrades/${specVersion}-to-${SLIDES_SPEC_VERSION}.mjs.`);
  } else if (specVersion !== SLIDES_SPEC_VERSION) {
    errors.push(`metadata.specVersion "${specVersion}" is not a known slides spec. Known versions: ${SLIDES_SPEC_VERSIONS.join(', ')}.`);
  }
  if (metadata.aspectRatio && metadata.aspectRatio !== '16:9') {
    warnings.push(`aspectRatio "${metadata.aspectRatio}" is not supported; use 16:9.`);
  }
  if (metadata.status && !['draft', 'published'].includes(metadata.status)) {
    errors.push('metadata.status must be "draft" or "published".');
  }
  if (metadata.status === 'published') {
    const target = metadata.canonical?.target;
    const url = metadata.canonical?.url;
    if (!PUBLISH_TARGETS.includes(target)) errors.push('A published deck needs canonical.target of google-slides or figma-slides.');
    if (!url || !/^https:\/\//.test(url)) errors.push('A published deck needs an https canonical.url.');
  }
  validateContributors(metadata, 'models', errors);
  validateContributors(metadata, 'agents', errors);

  const templates = listTemplates(templatesDir);
  const slideTemplates = listSlideTemplates(templatesDir);
  if (templatesDir && metadata.template && !templates.includes(metadata.template)) {
    errors.push(`Unknown deck template "${metadata.template}". Known deck templates: ${templates.join(', ') || 'none'}.`);
  }
  if (!fs.existsSync(path.join(dir, 'assets', 'default.css'))) {
    warnings.push('assets/default.css is missing, so the deck has no slide layout CSS.');
  }
  ignoredSlideFolders.forEach((name) => {
    warnings.push(`Ignored slides/${name}. Name slide folders 1, 2, 3.`);
  });

  if (slides.length === 0) errors.push('The slides directory has no numbered slide folders.');

  slides.forEach((slide, index) => {
    const label = `Slide ${slide.order || index + 1}`;
    if (slide.order !== index + 1) warnings.push(`${label} is out of sequence. Number folders 1, 2, 3 with no gaps.`);
    if (!SLIDE_TYPES.includes(slide.type)) errors.push(`${label} has unknown slide template "${slide.type}".`);
    else if (templatesDir && !slideTemplates.includes(slide.type)) errors.push(`${label} uses unknown slide template "${slide.type}".`);
    if (slide.notesMissing) warnings.push(`${label} is missing speaker-notes.md.`);
    if (slide.inferredType) warnings.push(`${label} has no type directive and was treated as ${slide.type}.`);
    slide.warnings.forEach((warning) => warnings.push(`${label}: ${warning}`));

    const quote = slide.blocks.find((block) => block.type === 'quote');
    if (['title', 'section', 'closing', 'content', 'split', 'beat', 'agenda', 'persona', 'stages', 'scene', 'compare'].includes(slide.type) && !slide.heading) {
      errors.push(`${label} needs a heading.`);
    }
    if (slide.type === 'quote' && !quote && !slide.heading) errors.push(`${label} needs a quote or a heading.`);

    const bulletCount = slide.blocks.filter((block) => block.type === 'bullets').reduce((sum, block) => sum + block.items.length, 0);
    if (slide.type === 'beat') {
      const parts = partitionBeat(slide);
      const story = parts.story.filter((block) => block.type === 'paragraph').map((block) => block.text).join(' ');
      if (!story.trim()) warnings.push(`${label} needs the story on the left.`);
      if (story.length > 1500) warnings.push(`${label} story is long for the left column. Move detail to notes.`);
      for (const rail of BEAT_RAILS) {
        const group = parts.rail.find((entry) => entry.kind === rail.kind);
        if (!group) warnings.push(`${label} is missing ${rail.label}.`);
        else if (group.items.filter((item) => itemDepth(item) === 0).length > 6) warnings.push(`${label} ${group.label} has more than six items. Keep that column scannable.`);
      }
    } else if (!['agenda', 'persona', 'stages', 'scene', 'compare'].includes(slide.type) && bulletCount > 5) {
      warnings.push(`${label} has ${bulletCount} bullets. Keep a slide to one idea.`);
    }
    if (slide.heading && slide.heading.length > 90) warnings.push(`${label} heading is long for a slide.`);
    for (const block of slide.blocks) {
      if (slide.type !== 'beat' && block.type === 'paragraph' && block.text.length > 280) warnings.push(`${label} has a paragraph that should be split or moved to notes.`);
      if (block.type === 'paragraph' && block.text.startsWith('|')) warnings.push(`${label} contains a table, which the viewer shows as plain text.`);
    }

    for (const src of assetRefs(slide)) {
      const kind = classifyAsset(src);
      if (kind === 'local') {
        if (!src.startsWith('assets/')) warnings.push(`${label} image "${src}" should live under assets/.`);
        const full = path.resolve(dir, src);
        const root = path.resolve(dir);
        if (full !== root && !full.startsWith(`${root}${path.sep}`)) errors.push(`${label} image "${src}" escapes the deck directory.`);
        else if (!fs.existsSync(full)) errors.push(`${label} image "${src}" was not found.`);
      } else if (kind === 'remote') {
        warnings.push(`${label} uses a remote image. Copy it into assets/ before publishing.`);
      } else {
        errors.push(`${label} image "${src}" must be a relative path inside the deck.`);
      }
    }
  });

  if (/replace with/i.test(text || '')) warnings.push('Placeholder text "Replace with" is still in the deck.');

  return { errors, warnings };
}

export function itemText(item) {
  return typeof item === 'string' ? item : String(item?.text || '');
}

export function itemDepth(item) {
  return typeof item === 'string' ? 0 : Number(item?.depth || 0);
}

export function plainText(value) {
  return String(itemText(value))
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,;:!?]|$)/g, '$1$2');
}

export function slidePlainText(slide) {
  const lines = [];
  for (const block of slide.blocks) {
    if (block.type === 'h3' || block.type === 'paragraph' || block.type === 'code') lines.push(plainText(block.text));
    if (block.type === 'quote') lines.push(plainText(block.text));
    if (block.type === 'bullets') {
      block.items.forEach((item) => {
        const mark = itemDepth(item) ? '  ◦' : '•';
        lines.push(`${mark} ${plainText(item)}`);
      });
    }
    if (block.type === 'image') lines.push(`[Image: ${block.alt || block.src}]`);
  }
  if (slide.media?.src) lines.push(`[Image: ${slide.media.src}]`);
  return lines.filter(Boolean).join('\n');
}
