import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const viewer = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'viewer.js'), 'utf8');

class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.className = '';
    this.attributes = {};
    this.style = { setProperty() {} };
    this.hidden = false;
    this.innerHTML = '';
    this.value = '';
    this.classList = {
      add: (name) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), name])].join(' '); },
      remove: (name) => { this.className = this.className.split(' ').filter((part) => part !== name).join(' '); },
      contains: (name) => this.className.split(' ').includes(name),
      toggle: (name, force) => {
        const enabled = force ?? !this.classList.contains(name);
        if (enabled) this.classList.add(name);
        else this.classList.remove(name);
        return enabled;
      }
    };
  }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value || this.innerHTML || this.children.map((child) => child.textContent).join(''); }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(typeof child === 'string' ? Object.assign(new Element('#text'), { textContent: child }) : child)); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener() {}
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
}

function render(slides) {
  const ids = new Map();
  for (const id of ['deck-data', 'viewport', 'deck-title', 'count', 'notes', 'notes-body', 'notes-toggle', 'present', 'progress', 'banner', 'prev', 'next']) {
    ids.set(id, new Element('div'));
  }
  ids.get('deck-data').textContent = JSON.stringify({ title: 'Test deck', slides });
  const stage = new Element('div');
  stage.clientWidth = 1920;
  stage.clientHeight = 1080;
  const document = {
    baseURI: 'https://example.test/deck/index.html',
    body: new Element('body'),
    getElementById: (id) => ids.get(id),
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => Object.assign(new Element('#text'), { textContent: text }),
    querySelector: (selector) => selector === '.stage' ? stage : null
  };
  vm.runInNewContext(viewer, {
    document, window: { addEventListener() {} },
    location: { hash: '' }, history: { replaceState() {} }, URL
  });
  return ids.get('viewport');
}

test('viewer renders nested bullets, beat personas, and bounded persona statistics', () => {
  const viewport = render([
    { type: 'content', order: 1, heading: 'Content', blocks: [{ type: 'bullets', items: [{ text: 'Nested detail', depth: 1 }] }], notes: '' },
    { type: 'beat', order: 2, heading: 'Beat', blocks: [], story: [], rail: [{ kind: 'users', label: 'Users', items: ['Alex — Designer'] }], notes: '' },
    { type: 'persona', order: 3, heading: 'Persona', blocks: [{ type: 'h3', text: '3 of 10000000' }], notes: '' }
  ]);
  const slides = viewport.querySelectorAll('.slide');
  assert.equal(slides.length, 3);
  const nested = slides[0].querySelectorAll('.is-nested')[0];
  assert.equal(nested.innerHTML, 'Nested detail');
  assert.ok(slides[1].querySelectorAll('.persona').length > 0);
  assert.equal(slides[2].querySelectorAll('.stat-grid')[0].children.length, 100);
});

test('viewer permits deck assets and blocks external image sources', () => {
  const viewport = render([{ type: 'content', order: 1, heading: 'Images', blocks: [
    { type: 'image', src: 'assets/plot.svg', alt: 'Plot' },
    { type: 'image', src: 'https://example.net/track.png', alt: 'External' },
    { type: 'image', src: 'assets/%2e%2e/private.png', alt: 'Traversal' }
  ], notes: '' }]);
  const images = viewport.querySelectorAll('.inline-image');
  assert.equal(images.length, 1);
  assert.equal(images[0].src, 'https://example.test/deck/assets/plot.svg');
  assert.equal(viewport.querySelectorAll('.slide')[0].textContent.includes('Blocked image source'), true);
});


test('viewer loads every supported slide type', () => {
  const types = ['title', 'section', 'content', 'split', 'quote', 'closing', 'beat', 'agenda', 'persona', 'stages', 'scene', 'compare'];
  const slides = types.map((type, index) => ({
    type, order: index + 1, heading: type, subheading: '', kicker: '', blocks: [],
    story: [], rail: [], media: null, notes: ''
  }));
  assert.equal(render(slides).querySelectorAll('.slide').length, types.length);
});
