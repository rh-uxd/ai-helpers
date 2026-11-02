'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

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
  const root = path.resolve(artifactsDir);
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Evidence path escapes artifacts directory: ${relative}`);
  }
  return target;
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
  return captureStableRender(page, async () => {
    const evidence = await captureTargetedFrame(page, options);
    if (options.readState) evidence.page_state = await options.readState();
    return evidence;
  }, options.stability);
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
  const root = path.resolve(artifactsDir);
  const segment = safeSegment(prefix);
  const viewport = page.viewportSize() || DEFAULT_VIEWPORT;
  const rawPath = resolvePortable(root, rawRelative);
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  await page.screenshot({ path: rawPath, fullPage: false, animations: 'disabled' });
  const rawBuffer = fs.readFileSync(rawPath);
  const targets = await collectVisibleTargets(page, { focus, maxCrops });
  const crops = [];
  let cropBytes = 0;
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const coordinates = clipForBox(target.box, viewport, padding);
    const relative = `evidence/crops/${segment}-${index + 1}.png`;
    const outputPath = resolvePortable(root, relative);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, clip: coordinates.clip, fullPage: false, animations: 'disabled' });
    const buffer = fs.readFileSync(outputPath);
    cropBytes += buffer.length;
    crops.push({
      id: `evidence-${segment}-${index + 1}`,
      capture_id: `capture-${segment}`,
      kind: target.kind,
      purpose,
      subject: target.subject,
      crop: coordinates.crop,
      image: {
        path: relative,
        width: coordinates.clip.width,
        height: coordinates.clip.height,
        sha256: sha256(buffer),
      },
      dom: target.dom,
    });
  }
  const modelScreenshots = crops.length ? crops.map(item => item.image.path) : [rawRelative];
  const selectedBytes = crops.length ? cropBytes : rawBuffer.length;
  const selectedPixels = crops.length ? crops.reduce((sum, item) => sum + (item.image.width * item.image.height), 0) : viewport.width * viewport.height;
  const rawPixels = viewport.width * viewport.height;
  return {
    capture: {
      id: `capture-${segment}`,
      viewport: { ...viewport, device_scale_factor: 1 },
      raw_image: { path: rawRelative, width: viewport.width, height: viewport.height, sha256: sha256(rawBuffer) },
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
}

module.exports = {
  DEFAULT_VIEWPORT,
  captureStableRender,
  captureTargetedEvidence,
  clipForBox,
  collectVisibleTargets,
  resolvePortable,
};
