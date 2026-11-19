'use strict';

// Save a full browser frame and small crops around useful page elements.
// This gives the host less image data to send; it does not judge the prototype.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const PENDING_IMAGES = Symbol('pendingEvidenceImages');

function sha256(buffer) {
  return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

function safeSegment(value) {
  const segment = String(value || 'capture').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return segment || 'capture';
}

function resolvePortable(artifactsDir, relative) {
  if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
    throw new Error(`Evidence path must be relative and portable: ${relative}`);
  }
  const requestedRoot = path.resolve(artifactsDir);
  let root = requestedRoot;
  try {
    root = fs.realpathSync(requestedRoot);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  // Treat both slash styles as separators so paths remain portable between
  // platforms, rather than allowing a Windows-style traversal on POSIX.
  const portableRelative = relative.split(/[\\/]/).join(path.sep);
  const target = path.resolve(root, portableRelative);
  if (target === root) {
    throw new Error(`Evidence path must name a file below the artifacts directory: ${relative}`);
  }
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!target.startsWith(rootPrefix)) {
    throw new Error(`Evidence path escapes artifacts directory: ${relative}`);
  }

  // Lexical confinement does not protect a path whose existing directory is a
  // symlink. Check each existing component below the artifact root before any
  // caller writes to the returned path.
  const segments = path.relative(root, target).split(path.sep).filter(Boolean);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Evidence path contains a symlink: ${relative}`);
    }
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error(`Evidence path parent is not a directory: ${relative}`);
    }
  }
  return target;
}

function ensurePortableParent(artifactsDir, relative) {
  const requestedRoot = path.resolve(artifactsDir);
  fs.mkdirSync(requestedRoot, { recursive: true });
  // Validate before creating any caller-controlled subdirectories.
  resolvePortable(requestedRoot, relative);
  const root = fs.realpathSync(requestedRoot);
  const portableRelative = relative.split(/[\\/]/).join(path.sep);
  const parent = path.dirname(portableRelative);
  let current = root;
  if (parent !== '.') {
    for (const segment of parent.split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      try {
        fs.mkdirSync(current);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`Evidence path parent is not a safe directory: ${relative}`);
      }
    }
  }
}

function withFreshSuffix(relative) {
  const parsed = path.parse(relative.split(/[\\/]/).join(path.sep));
  const suffix = crypto.randomBytes(8).toString('hex');
  return path.join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`).split(path.sep).join('/');
}

function writeCapture(artifactsDir, preferredRelative, buffer) {
  ensurePortableParent(artifactsDir, preferredRelative);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const relative = attempt === 0 ? preferredRelative : withFreshSuffix(preferredRelative);
    const outputPath = resolvePortable(artifactsDir, relative);
    try {
      // `wx` is the final collision guard; screenshots are captured to memory
      // so Playwright never follows or truncates an existing destination. Use
      // the requested path when fresh, then fall back to unique names on reuse.
      fs.writeFileSync(outputPath, buffer, { flag: 'wx' });
      return { path: outputPath, relative };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Could not allocate a fresh evidence path for: ${preferredRelative}`);
}

function clipForBox(box, viewport, padding = 16) {
  const normalized = {
    x: Math.max(0, Math.floor(Number(box.x))),
    y: Math.max(0, Math.floor(Number(box.y))),
    width: Math.max(1, Math.ceil(Number(box.width))),
    height: Math.max(1, Math.ceil(Number(box.height))),
    padding: Math.max(0, Math.floor(Number(padding))),
  };
  const left = Math.max(0, normalized.x - normalized.padding);
  const top = Math.max(0, normalized.y - normalized.padding);
  const right = Math.min(viewport.width, normalized.x + normalized.width + normalized.padding);
  const bottom = Math.min(viewport.height, normalized.y + normalized.height + normalized.padding);
  if (left >= right || top >= bottom) throw new Error('Evidence target is outside the viewport');
  return {
    crop: normalized,
    clip: { x: left, y: top, width: right - left, height: bottom - top },
  };
}

async function collectVisibleTargets(page, { focus = '', maxCrops = 6 } = {}) {
  // Pick a few useful visible areas and controls. This is not a full-page
  // audit, an accessibility test or proof that an AC passed.
  return page.evaluate(({ requestedFocus, requestedLimit }) => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const focusText = clean(requestedFocus).toLowerCase();
    const limit = Math.max(1, Math.min(12, Number(requestedLimit) || 6));
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const implicitRole = element => ({
      A: 'link', BUTTON: 'button', INPUT: 'textbox', SELECT: 'combobox',
      TEXTAREA: 'textbox', NAV: 'navigation', MAIN: 'main', TABLE: 'table', FORM: 'form',
    }[element.tagName] || 'region');
    const nameOf = element => clean(
      element.getAttribute('aria-label') || element.getAttribute('title') ||
      element.getAttribute('placeholder') || element.textContent || element.getAttribute('value')
    ).slice(0, 280);
    const escapeAttribute = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const locatorOf = element => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute('data-testid');
      if (testId) return `[data-testid="${escapeAttribute(testId)}"]`;
      const label = element.getAttribute('aria-label');
      if (label) return `${element.tagName.toLowerCase()}[aria-label="${escapeAttribute(label)}"]`;
      const parts = [];
      let current = element;
      while (current && current !== document.body && parts.length < 4) {
        const tag = current.tagName.toLowerCase();
        const same = current.parentElement ? Array.from(current.parentElement.children).filter(child => child.tagName === current.tagName) : [];
        parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag);
        current = current.parentElement;
      }
      return parts.join(' > ').slice(0, 500);
    };
    const describe = (element, kind, rank) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(viewport.width, rect.right);
      const bottom = Math.min(viewport.height, rect.bottom);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || right <= left || bottom <= top) return null;
      const name = nameOf(element);
      const focused = focusText && (name.toLowerCase() === focusText || name.toLowerCase().includes(focusText) || focusText.includes(name.toLowerCase()));
      const primary = element.matches('.pf-m-primary,[data-variant="primary"],[class*="pf-m-primary"]');
      return {
        kind,
        rank: focused ? -100 : primary ? rank - 20 : rank,
        subject: { role: element.getAttribute('role') || implicitRole(element), name, locator: locatorOf(element) },
        box: { x: Math.floor(left), y: Math.floor(top), width: Math.ceil(right - left), height: Math.ceil(bottom - top) },
        dom: {
          text: clean(element.textContent).slice(0, 1000),
          attributes: Object.fromEntries(['aria-label', 'aria-expanded', 'aria-selected', 'aria-disabled', 'role', 'title', 'value', 'disabled', 'selected']
            .map(key => [key, element.getAttribute(key)]).filter(([, value]) => value !== null).map(([key, value]) => [key, clean(value).slice(0, 280)])),
        },
      };
    };
    const candidates = [];
    const main = document.querySelector('main,[role="main"],.pf-v6-c-page__main-section,.pf-v5-c-page__main-section');
    if (main) candidates.push(describe(main, 'region', 0));
    const controls = Array.from(document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="radio"]'));
    controls.slice(0, 100).forEach((element, index) => candidates.push(describe(element, 'component', 100 + index)));
    const seen = new Set();
    return candidates.filter(Boolean).sort((a, b) => a.rank - b.rank).filter(candidate => {
      const key = `${candidate.subject.locator}|${candidate.box.x}|${candidate.box.y}|${candidate.box.width}|${candidate.box.height}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit).map(({ rank, ...candidate }) => candidate);
  }, { requestedFocus: focus, requestedLimit: maxCrops });
}

// Call after each action, with a locator for the intended state when it loads
// asynchronously. A quiet DOM alone cannot predict future application timers.
// Checks serialized DOM and live form values; canvas/media and other rendering
// changes still require an application-specific readiness boundary.
async function captureStableRender(page, capture, { ready, settleMs = 150, timeout = 5000 } = {}) {
  const deadline = Date.now() + timeout;
  if (ready) await ready.waitFor({ state: 'visible', timeout });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const renderState = async quiet => {
    if (quiet !== undefined) {
      await new Promise((resolve, reject) => {
        let timer;
        const done = () => { observer.disconnect(); clearTimeout(limit); resolve(); };
        const reset = () => { clearTimeout(timer); timer = setTimeout(done, quiet); };
        const observer = new MutationObserver(reset);
        const limit = setTimeout(() => { observer.disconnect(); clearTimeout(timer); reject(new Error('Render did not settle')); }, 2000);
        observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
        reset();
      });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    // Values are not necessarily reflected in attributes/textContent. Keep this
    // transient comparison state private; do not add it to persisted evidence.
    return JSON.stringify({
      html: document.documentElement.outerHTML,
      controls: Array.from(document.querySelectorAll('input,textarea,select,option'), element => ({
        value: element.value,
        checked: element.checked,
        indeterminate: element.indeterminate,
        selected: element.selected,
      })),
    });
  };
  while (Date.now() < deadline) {
    const before = await page.evaluate(renderState, settleMs);
    const result = await capture();
    const after = await page.evaluate(renderState);
    if (before === after) return result;
  }
  throw new Error('Evidence capture changed during screenshot/DOM sampling; wait for the intended state and retry capture');
}

async function captureTargetedEvidence(page, options = {}) {
  // Save images only after the screenshot and page state agree. Keep failed
  // attempts in memory so they do not leave misleading evidence on disk.
  const evidence = await captureStableRender(page, async () => {
    const evidence = await captureTargetedFrame(page, options);
    if (options.readState) evidence.page_state = await options.readState();
    return evidence;
  }, options.stability);
  try {
    for (const pending of evidence[PENDING_IMAGES]) {
      pending.reference.path = writeCapture(options.artifactsDir, pending.preferredRelative, pending.buffer).relative;
    }
    evidence.model_screenshots = evidence.crops.length
      ? evidence.crops.map(item => item.image.path)
      : [evidence.capture.raw_image.path];
    return evidence;
  } finally {
    delete evidence[PENDING_IMAGES];
  }
}

async function captureTargetedFrame(page, {
  artifactsDir,
  prefix,
  rawRelative,
  purpose = 'journey',
  focus = '',
  maxCrops = 6,
  padding = 16,
} = {}) {
  const segment = safeSegment(prefix);
  const viewport = page.viewportSize() || DEFAULT_VIEWPORT;
  const rawBuffer = await page.screenshot({ fullPage: false, animations: 'disabled' });
  const targets = await collectVisibleTargets(page, { focus, maxCrops });
  const crops = [];
  const pendingImages = [];
  let cropBytes = 0;
  const rawImage = { path: rawRelative, width: viewport.width, height: viewport.height, sha256: sha256(rawBuffer) };
  pendingImages.push({ preferredRelative: rawRelative, buffer: rawBuffer, reference: rawImage });
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const coordinates = clipForBox(target.box, viewport, padding);
    const preferredRelative = `evidence/crops/${segment}-${index + 1}.png`;
    const buffer = await page.screenshot({ clip: coordinates.clip, fullPage: false, animations: 'disabled' });
    cropBytes += buffer.length;
    const image = {
      path: preferredRelative,
      width: coordinates.clip.width,
      height: coordinates.clip.height,
      sha256: sha256(buffer),
    };
    pendingImages.push({ preferredRelative, buffer, reference: image });
    crops.push({
      id: `evidence-${segment}-${index + 1}`,
      capture_id: `capture-${segment}`,
      kind: target.kind,
      purpose,
      subject: target.subject,
      crop: coordinates.crop,
      image,
      dom: target.dom,
    });
  }
  const modelScreenshots = crops.length ? crops.map(item => item.image.path) : [rawRelative];
  const selectedBytes = crops.length ? cropBytes : rawBuffer.length;
  const selectedPixels = crops.length ? crops.reduce((sum, item) => sum + (item.image.width * item.image.height), 0) : viewport.width * viewport.height;
  const rawPixels = viewport.width * viewport.height;
  const evidence = {
    capture: {
      id: `capture-${segment}`,
      viewport: { ...viewport, device_scale_factor: 1 },
      raw_image: rawImage,
    },
    crops,
    model_screenshots: modelScreenshots,
    input_metrics: {
      raw_image_bytes: rawBuffer.length,
      selected_image_bytes: selectedBytes,
      raw_pixels: rawPixels,
      selected_pixels: selectedPixels,
      pixel_ratio: Math.round((selectedPixels / rawPixels) * 10000) / 10000,
    },
  };
  Object.defineProperty(evidence, PENDING_IMAGES, { value: pendingImages, configurable: true });
  return evidence;
}

module.exports = {
  DEFAULT_VIEWPORT,
  captureStableRender,
  captureTargetedEvidence,
  clipForBox,
  collectVisibleTargets,
  resolvePortable,
};
