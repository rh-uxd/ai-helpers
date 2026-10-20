import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSlidesMarkdown, partitionBeat, validateDeck, loadDeck, SLIDES_SPEC_VERSION } from './parse-slides.mjs';
import { instantiateDeck } from './instantiate-deck.mjs';
import { exportDeck } from '../../uxd-slides-export/scripts/export-slides.mjs';
import { planGooglePublish, presentationIdFromInput } from '../../uxd-slides-publish/scripts/publish-google.mjs';
import { fileKeyFromSlidesUrl, planFigmaPublish } from '../../uxd-slides-publish/scripts/publish-figma.mjs';
import { markPublished } from '../../uxd-slides-publish/scripts/mark-published.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.join(HERE, '..', 'templates');
const VALIDATE = path.join(HERE, 'validate-slides.mjs');
const PUBLISH = path.join(HERE, '..', '..', 'uxd-slides-publish', 'scripts', 'publish-google.mjs');
const PUBLISH_FIGMA = path.join(HERE, '..', '..', 'uxd-slides-publish', 'scripts', 'publish-figma.mjs');

const SAMPLE = `<!-- type: title -->
# Catalog review

## A decision for the design team

<!-- notes
Open with the decision.
-->

---

<!-- type: content -->
<!-- kicker: Today -->
# One idea

The list hides the **next** step.

- Primary action is below the fold
- Status is easy to miss

---

<!-- type: split -->
<!-- image: assets/screen.svg -->
# Show the screen

Researchers still ask which model they can deploy.

---

<!-- type: quote -->
# A platform engineer

> I can see the names and still not tell what I can deploy.

---

<!-- type: closing -->
# Decide the next check
`;

function writeSlide(root, order, { template, kicker = '', image = '', content, notes = '', css = '' }) {
  const dir = path.join(root, 'slides', String(order));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'content.md'), content);
  fs.writeFileSync(path.join(dir, 'speaker-notes.md'), notes);
  const meta = { template };
  if (kicker) meta.kicker = kicker;
  if (image) meta.image = image;
  fs.writeFileSync(path.join(dir, 'metadata.json'), `${JSON.stringify(meta, null, 2)}\n`);
  if (css) fs.writeFileSync(path.join(dir, 'custom.css'), css);
}

function writeDeck(root, { template = 'design-review', title = 'Catalog review', description = 'Design review for the model catalog list.' } = {}) {
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(TEMPLATES, 'theme', 'default.css'), path.join(root, 'assets', 'default.css'));
  fs.writeFileSync(path.join(root, 'assets', 'screen.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><rect width="64" height="40" fill="#ee0000"/></svg>');
  writeSlide(root, 1, {
    template: 'title',
    notes: 'Open with the decision.',
    content: '# Catalog review\n\n## A decision for the design team\n'
  });
  writeSlide(root, 2, {
    template: 'content',
    kicker: 'Today',
    content: '# One idea\n\nThe list hides the **next** step.\n\n- Primary action is below the fold\n- Status is easy to miss\n'
  });
  writeSlide(root, 3, {
    template: 'split',
    image: 'assets/screen.svg',
    content: '# Show the screen\n\nResearchers still ask which model they can deploy.\n'
  });
  writeSlide(root, 4, {
    template: 'quote',
    content: '# A platform engineer\n\n> I can see the names and still not tell what I can deploy.\n'
  });
  writeSlide(root, 5, {
    template: 'closing',
    content: '# Decide the next check\n'
  });
  fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({
    title,
    description,
    template,
    specVersion: '0.1.0',
    aspectRatio: '16:9',
    status: 'draft',
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z'
  }, null, 2));
}

test('parses slide types, notes, and a local image', () => {
  const slides = parseSlidesMarkdown(SAMPLE);
  assert.equal(slides.length, 5);
  assert.equal(slides[0].type, 'title');
  assert.equal(slides[0].notes, 'Open with the decision.');
  assert.equal(slides[1].kicker, 'Today');
  assert.equal(slides[1].blocks.find((block) => block.type === 'bullets').items.length, 2);
  assert.equal(slides[2].media.src, 'assets/screen.svg');
  assert.equal(slides[3].blocks[0].type, 'quote');
});

test('rejects a missing asset and accepts a complete deck', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  writeDeck(root);
  fs.rmSync(path.join(root, 'assets', 'screen.svg'));
  const broken = loadDeck(root);
  const brokenReport = validateDeck(broken, { templatesDir: TEMPLATES });
  assert.ok(brokenReport.errors.some((error) => error.includes('was not found')));

  writeDeck(root);
  const report = validateDeck(loadDeck(root), { templatesDir: TEMPLATES });
  assert.deepEqual(report.errors, []);
});

test('exports a multi-file viewer and a dry-run does not call Google', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  const output = path.join(root, 'export');
  const deckDir = path.join(root, 'slides');
  writeDeck(deckDir);
  fs.writeFileSync(path.join(deckDir, 'assets', 'custom.css'), ':root { --slide-accent: #0066cc; }\n');
  writeSlide(deckDir, 2, {
    template: 'content',
    kicker: 'Today',
    css: 'h1 { color: navy; }\n',
    content: '# One idea\n\nThe list hides the **next** step.\n\n- Primary action is below the fold\n- Status is easy to miss\n'
  });
  const exported = exportDeck(deckDir, { output });
  for (const file of ['index.html', 'viewer.css', 'viewer.js', 'deck.json', 'assets/default.css', 'assets/screen.svg', 'assets/custom.css', 'slide-overrides.css']) {
    assert.ok(fs.existsSync(path.join(output, file)), file);
  }
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /Catalog review/);
  assert.match(html, /href="\.\/assets\/default\.css"/);
  assert.match(html, /href="\.\/assets\/custom\.css"/);
  assert.match(html, /href="\.\/slide-overrides\.css"/);
  assert.match(html, /src="\.\/viewer\.js"/);
  const viewer = fs.readFileSync(path.join(output, 'viewer.js'), 'utf8');
  const helperNames = [...viewer.matchAll(/^  function (\w+)\(/gm)].map((match) => match[1]);
  assert.equal(new Set(helperNames).size, helperNames.length, 'viewer helpers must not shadow one another');
  assert.doesNotMatch(html, /function fit\(/);
  assert.doesNotMatch(html, /fonts\.googleapis/);
  assert.match(fs.readFileSync(path.join(output, 'assets', 'default.css'), 'utf8'), /\.slide-title/);
  assert.match(fs.readFileSync(path.join(output, 'slide-overrides.css'), 'utf8'), /@scope \(#slide-2\)/);
  assert.equal(exported.manifest.slideCount, 5);

  const plan = planGooglePublish(loadDeck(path.join(root, 'slides')), { stamp: 'test' });
  assert.equal(plan.groups.length, 5);
  assert.equal(plan.groups[0][0].createSlide.objectId, 'uxd_test_00');
  assert.equal(plan.imageNotes.length, 1);

  const dry = spawnSync(process.execPath, [PUBLISH, path.join(root, 'slides'), '--dry-run'], { encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /mode: dry-run/);
  assert.match(dry.stdout, /No Google Slides request was sent/);
  assert.doesNotMatch(dry.stdout, /^url:/m);

  const googleUrl = spawnSync(process.execPath, [
    PUBLISH,
    path.join(root, 'slides'),
    '--dry-run',
    '--presentation-id',
    'https://docs.google.com/presentation/d/abc123/edit'
  ], { encoding: 'utf8' });
  assert.equal(googleUrl.status, 0, googleUrl.stderr);
  assert.match(googleUrl.stdout, /presentation: abc123/);
  assert.equal(presentationIdFromInput('https://docs.google.com/presentation/d/abc123/edit?usp=sharing'), 'abc123');
});

test('plans a Figma deck without writing a file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  writeDeck(root);
  const created = planFigmaPublish(loadDeck(root));
  assert.equal(created.action, 'create');
  assert.equal(created.fileKey, null);
  assert.equal(created.slides.length, 5);
  assert.equal(created.slides[2].image, 'assets/screen.svg');
  assert.equal(created.slides[2].imagePath, path.join(root, 'assets', 'screen.svg'));
  assert.match(created.slides[1].body, /next/);
  assert.doesNotMatch(created.slides[1].body, /\*\*/);
  assert.equal(created.slides[0].notes, 'Open with the decision.');

  const metaPath = path.join(root, 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  metadata.canonical = {
    target: 'figma-slides',
    url: 'https://www.figma.com/slides/Abcd1234Efgh5678Ijkl90/Catalog',
    publishedAt: '2026-10-12T15:00:00.000Z'
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata));
  const update = planFigmaPublish(loadDeck(root));
  assert.equal(update.action, 'update');
  assert.equal(update.fileKey, 'Abcd1234Efgh5678Ijkl90');
  assert.equal(fileKeyFromSlidesUrl(metadata.canonical.url), 'Abcd1234Efgh5678Ijkl90');

  const out = path.join(root, 'plan.json');
  const planned = spawnSync(process.execPath, [PUBLISH_FIGMA, root, '--out', out], { encoding: 'utf8' });
  assert.equal(planned.status, 0, planned.stderr);
  assert.match(planned.stdout, /mode: plan/);
  assert.match(planned.stdout, /action: update/);
  assert.doesNotMatch(planned.stdout, /^url:/m);
  const written = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(written.slides[2].template, 'split');
  const after = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  assert.equal(after.status, 'draft');
});

test('marks a real Google URL and rejects a mismatched one', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  writeDeck(root);
  assert.throws(
    () => markPublished(root, { target: 'google-slides', url: 'https://www.figma.com/slides/abc' }),
    /does not look like/
  );
  const metadata = markPublished(root, {
    target: 'google-slides',
    url: 'https://docs.google.com/presentation/d/abc123/edit',
    publishedAt: '2026-10-12T15:00:00.000Z'
  });
  assert.equal(metadata.status, 'published');
  assert.equal(metadata.canonical.target, 'google-slides');
  const exported = exportDeck(root, { output: path.join(root, 'export') });
  const html = fs.readFileSync(path.join(exported.outputDir, 'index.html'), 'utf8');
  assert.match(html, /docs\.google\.com\/presentation\/d\/abc123/);
  assert.match(html, /"status":"published"/);
});

const BEAT = `<!-- type: beat -->
<!-- kicker: Part 1 -->
<!-- image: assets/sketch.png -->
# Alex starts without a model

Alex is asked to summarize factory status and cannot call a hosted API.

### Users

- **Alex** — App developer
- **Sara** — Security operations

### Unmet needs

- [No local path into a model](https://example.com/research)

### Solutions

- [Podman Desktop AI Lab](https://example.com/podman)
`;

test('splits a journey beat into story and rail', () => {
  const slide = parseSlidesMarkdown(BEAT)[0];
  assert.equal(slide.type, 'beat');
  assert.equal(slide.kicker, 'Part 1');
  const parts = partitionBeat(slide);
  assert.equal(parts.story.length, 1);
  assert.equal(parts.story[0].type, 'paragraph');
  assert.deepEqual(parts.rail.map((group) => group.kind), ['users', 'needs', 'solutions']);
  assert.equal(parts.rail[0].items.length, 2);
  assert.match(parts.rail[1].items[0], /example\.com\/research/);
});

test('exports a journey beat with the right rail', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(TEMPLATES, 'theme', 'default.css'), path.join(root, 'assets', 'default.css'));
  fs.writeFileSync(path.join(root, 'assets', 'sketch.png'), Buffer.from('not-a-real-png'));
  writeSlide(root, 1, {
    template: 'beat',
    kicker: 'Part 1',
    image: 'assets/sketch.png',
    content: `# Alex starts without a model

Alex is asked to summarize factory status and cannot call a hosted API.

### Users

- **Alex** — App developer
- **Sara** — Security operations

### Unmet needs

- [No local path into a model](https://example.com/research)

### Solutions

- [Podman Desktop AI Lab](https://example.com/podman)
`
  });
  fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({
    title: 'Golden path',
    description: 'A user journey for local model setup.',
    template: 'user-journey',
    specVersion: '0.1.0',
    aspectRatio: '16:9',
    status: 'draft',
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z'
  }, null, 2));
  const report = validateDeck(loadDeck(root), { templatesDir: TEMPLATES });
  assert.deepEqual(report.errors, []);
  const exported = exportDeck(root, { output: path.join(root, 'export') });
  const deck = JSON.parse(fs.readFileSync(path.join(exported.outputDir, 'deck.json'), 'utf8'));
  assert.equal(deck.slides[0].rail[0].kind, 'users');
  assert.equal(deck.slides[0].rail[2].items[0].includes('Podman'), true);
  assert.match(fs.readFileSync(path.join(exported.outputDir, 'assets', 'default.css'), 'utf8'), /\.slide-beat/);
  const plan = planGooglePublish(loadDeck(root), { stamp: 'beat' });
  const ids = plan.groups[0].map((request) => request.createShape?.objectId).filter(Boolean);
  assert.ok(ids.includes('uxd_beat_00_r'));
  assert.equal(plan.imageNotes[0], 'assets/sketch.png');
  const figma = planFigmaPublish(loadDeck(root));
  assert.equal(figma.slides[0].template, 'beat');
  assert.deepEqual(figma.slides[0].rail.map((group) => group.kind), ['users', 'needs', 'solutions']);
  assert.equal(figma.slides[0].imagePath, path.join(root, 'assets', 'sketch.png'));
});

test('template placeholders fail strict validation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  instantiateDeck('briefing', root, { templatesDir: TEMPLATES });
  fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({
    title: 'Placeholder',
    description: 'Template copy',
    template: 'briefing',
    specVersion: '0.1.0',
    aspectRatio: '16:9',
    status: 'draft',
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z'
  }));
  const loose = spawnSync(process.execPath, [VALIDATE, root], { encoding: 'utf8' });
  assert.equal(loose.status, 0, loose.stderr);
  assert.match(loose.stdout, /slides spec 0\.1\.0/);
  assert.match(loose.stderr, /Replace with/);
  const strict = spawnSync(process.execPath, [VALIDATE, root, '--strict'], { encoding: 'utf8' });
  assert.equal(strict.status, 1);
});

test('accepts model and agent records and rejects a bad list', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  writeDeck(root);
  const metaPath = path.join(root, 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  metadata.models = [
    { id: 'claude-sonnet-4.6', description: 'Drafted the slide copy.' }
  ];
  metadata.agents = [
    { id: 'uxd-slides-create', description: 'Built the deck from the design-review template.' }
  ];
  fs.writeFileSync(metaPath, JSON.stringify(metadata));
  const valid = validateDeck(loadDeck(root), { templatesDir: TEMPLATES });
  assert.deepEqual(valid.errors, []);

  metadata.models = [{ description: 'Missing the model id.' }];
  fs.writeFileSync(metaPath, JSON.stringify(metadata));
  const invalid = validateDeck(loadDeck(root), { templatesDir: TEMPLATES });
  assert.ok(invalid.errors.some((error) => error.includes('metadata.models[0].id')));
});

test('records the current slides spec and rejects an unknown one', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-slides-'));
  instantiateDeck('briefing', root, { templatesDir: TEMPLATES });
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'metadata.json'), 'utf8'));
  assert.equal(metadata.specVersion, SLIDES_SPEC_VERSION);

  writeDeck(root);
  const deckMeta = JSON.parse(fs.readFileSync(path.join(root, 'metadata.json'), 'utf8'));
  deckMeta.specVersion = '9.9.9';
  fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify(deckMeta));
  const report = validateDeck(loadDeck(root), { templatesDir: TEMPLATES });
  assert.ok(report.errors.some((error) => error.includes('9.9.9')));
});
