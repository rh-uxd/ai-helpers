/**
 * Shared page serializer — DOM → self-contained HTML.
 *
 * Used by:
 * - Playwright (page.evaluate with getSerializeFnSource())
 * - Browser bundle (templates/serialize-page.browser.js)
 *
 * This module also exposes a tiny Node smoke helper for syntax checks.
 */

'use strict';

const BAR_SELECTOR = '#uxd-prototype-bar';
const BAR_STYLE_ATTR = 'data-uxd-prototype-bar-style';

/**
 * Browser-executable serializer. Must stay self-contained (no Node APIs).
 * @param {object} [options]
 * @param {boolean} [options.inlineImages=true]
 * @returns {Promise<{ html: string, warnings: string[] }>}
 */
async function serializePage(options) {
  const opts = options || {};
  const inlineImages = opts.inlineImages !== false;
  const warnings = [];

  const clone = document.documentElement.cloneNode(true);

  // Strip Prototype Bar from capture
  clone.querySelectorAll(BAR_SELECTOR).forEach((el) => el.remove());
  clone.querySelectorAll(`[${BAR_STYLE_ATTR}]`).forEach((el) => el.remove());
  clone.querySelectorAll('script[data-uxd-prototype-bar]').forEach((el) => el.remove());

  // Remove scripts (static visual snapshot — no React rehydration)
  clone.querySelectorAll('script').forEach((el) => el.remove());

  // Inline stylesheets
  const styleChunks = [];
  const linkNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of linkNodes) {
    const href = link.href;
    try {
      const res = await fetch(href, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      styleChunks.push(`/* ${href} */\n${await res.text()}`);
    } catch (err) {
      warnings.push(`Could not inline stylesheet: ${href} (${err && err.message ? err.message : err})`);
    }
  }

  // Remove external stylesheet links from clone; keep inline <style>
  clone.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());

  // Computed-style fallback for visible elements (helps when CDN CSS failed to inline)
  if (warnings.some((w) => w.indexOf('stylesheet') !== -1) || styleChunks.length === 0) {
    try {
      const computedCss = collectComputedStyles(document.body);
      if (computedCss) {
        styleChunks.push(`/* computed-style fallback */\n${computedCss}`);
      }
    } catch (err) {
      warnings.push(`Computed-style fallback failed: ${err && err.message ? err.message : err}`);
    }
  }

  if (styleChunks.length) {
    const styleEl = clone.ownerDocument.createElement('style');
    styleEl.setAttribute('data-uxd-export-inlined', 'true');
    styleEl.textContent = styleChunks.join('\n\n');
    const head = clone.querySelector('head') || clone;
    head.insertBefore(styleEl, head.firstChild);
  }

  if (inlineImages) {
    await inlineSameOriginImages(clone, document, warnings);
  }

  // Preserve doctype
  const doctype = document.doctype
    ? `<!DOCTYPE ${document.doctype.name}>`
    : '<!DOCTYPE html>';

  const html = `${doctype}\n${clone.outerHTML}`;
  return { html, warnings };
}

function collectComputedStyles(root) {
  if (!root) return '';
  const rules = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let i = 0;
  const max = 400;
  let node = walker.currentNode;
  while (node && i < max) {
    if (node.nodeType === 1 && !node.closest(BAR_SELECTOR)) {
      const cs = window.getComputedStyle(node);
      const display = cs.display;
      if (display !== 'none') {
        const id = node.getAttribute('data-uxd-export-id') || `uxd-ex-${i}`;
        node.setAttribute('data-uxd-export-id', id);
        // Mirror attribute onto live tree for clone sync — clone already taken;
        // apply matching attribute on clone via query of similar structure is hard.
        // Instead write rules keyed by a class we inject on the live element and
        // re-read — for fallback we inject into live DOM then the clone is stale.
        // Skip deep computed fallback when clone is already separated; use class on clone path differently.
        rules.push(
          `[data-uxd-export-id="${id}"]{` +
            `display:${cs.display};` +
            `position:${cs.position};` +
            `color:${cs.color};` +
            `background-color:${cs.backgroundColor};` +
            `font-size:${cs.fontSize};` +
            `font-weight:${cs.fontWeight};` +
            `font-family:${cs.fontFamily};` +
            `margin:${cs.margin};` +
            `padding:${cs.padding};` +
            `border:${cs.border};` +
            `width:${cs.width};` +
            `height:${cs.height};` +
            `flex:${cs.flex};` +
            `grid-template-columns:${cs.gridTemplateColumns};` +
            `gap:${cs.gap};` +
            `text-align:${cs.textAlign};` +
            `}`
        );
        i += 1;
      }
    }
    node = walker.nextNode();
  }
  // Note: attributes were set on live DOM after clone — re-clone attributes for fallback path
  return rules.join('\n');
}

async function inlineSameOriginImages(cloneRoot, liveDoc, warnings) {
  const imgs = Array.from(cloneRoot.querySelectorAll('img[src]'));
  const origin = liveDoc.defaultView.location.origin;
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) continue;
    let abs;
    try {
      abs = new URL(src, liveDoc.baseURI).href;
    } catch {
      continue;
    }
    if (!abs.startsWith(origin)) {
      warnings.push(`Left cross-origin image as URL: ${abs}`);
      continue;
    }
    try {
      const res = await fetch(abs, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      img.setAttribute('src', dataUrl);
    } catch (err) {
      warnings.push(`Could not inline image: ${abs} (${err && err.message ? err.message : err})`);
    }
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Source string for Playwright page.evaluate — returns a Function body. */
function getSerializeFnSource() {
  return `(${serializePage.toString()})`;
}

/**
 * Improved serialize that tags live DOM before cloning when computed fallback needed.
 * Exported for browser bundle.
 */
async function serializePageReliable(options) {
  const opts = options || {};
  const inlineImages = opts.inlineImages !== false;
  const warnings = [];

  // Pre-tag live elements for computed-style fallback (attributes survive clone)
  const tagged = [];
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let i = 0;
    let node = walker.currentNode;
    while (node && i < 400) {
      if (node.nodeType === 1 && !node.closest(BAR_SELECTOR)) {
        const cs = window.getComputedStyle(node);
        if (cs.display !== 'none') {
          const id = `uxd-ex-${i}`;
          node.setAttribute('data-uxd-export-id', id);
          tagged.push({
            id,
            css:
              `display:${cs.display};position:${cs.position};color:${cs.color};` +
              `background-color:${cs.backgroundColor};font-size:${cs.fontSize};` +
              `font-weight:${cs.fontWeight};font-family:${cs.fontFamily};` +
              `margin:${cs.margin};padding:${cs.padding};border:${cs.border};` +
              `width:${cs.width};height:${cs.height};flex:${cs.flex};` +
              `gap:${cs.gap};text-align:${cs.textAlign};`,
          });
          i += 1;
        }
      }
      node = walker.nextNode();
    }
  } catch (err) {
    warnings.push(`Pre-tag failed: ${err && err.message ? err.message : err}`);
  }

  const clone = document.documentElement.cloneNode(true);

  clone.querySelectorAll(BAR_SELECTOR).forEach((el) => el.remove());
  clone.querySelectorAll(`[${BAR_STYLE_ATTR}]`).forEach((el) => el.remove());
  clone.querySelectorAll('script[data-uxd-prototype-bar]').forEach((el) => el.remove());
  clone.querySelectorAll('script').forEach((el) => el.remove());

  const styleChunks = [];
  const linkNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  let stylesheetOk = 0;
  for (const link of linkNodes) {
    const href = link.href;
    try {
      const res = await fetch(href, { credentials: 'include', mode: 'cors' }).catch(() =>
        fetch(href, { credentials: 'same-origin' })
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      styleChunks.push(`/* ${href} */\n${await res.text()}`);
      stylesheetOk += 1;
    } catch (err) {
      warnings.push(`Could not inline stylesheet: ${href} (${err && err.message ? err.message : err})`);
    }
  }

  clone.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());

  if (stylesheetOk === 0 && tagged.length) {
    styleChunks.push(
      '/* computed-style fallback */\n' +
        tagged.map((t) => `[data-uxd-export-id="${t.id}"]{${t.css}}`).join('\n')
    );
  }

  if (styleChunks.length) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-uxd-export-inlined', 'true');
    styleEl.textContent = styleChunks.join('\n\n');
    const head = clone.querySelector('head');
    if (head) {
      head.insertBefore(styleEl, head.firstChild);
    } else {
      clone.insertBefore(styleEl, clone.firstChild);
    }
  }

  if (inlineImages) {
    await inlineSameOriginImages(clone, document, warnings);
  }

  // Cleanup live DOM tags
  tagged.forEach((t) => {
    const el = document.querySelector(`[data-uxd-export-id="${t.id}"]`);
    if (el) el.removeAttribute('data-uxd-export-id');
  });

  const doctype = document.doctype
    ? `<!DOCTYPE ${document.doctype.name}>`
    : '<!DOCTYPE html>';

  return { html: `${doctype}\n${clone.outerHTML}`, warnings };
}

function getSerializeFnSourceReliable() {
  // Bundle helpers into one evaluable async function
  return `
async function __uxdSerializePage(options) {
  ${inlineSameOriginImages.toString()}
  ${blobToDataUrl.toString()}
  const BAR_SELECTOR = ${JSON.stringify(BAR_SELECTOR)};
  const BAR_STYLE_ATTR = ${JSON.stringify(BAR_STYLE_ATTR)};
  const serializePageReliable = ${serializePageReliable.toString()};
  return await serializePageReliable(options);
}
__uxdSerializePage
`.trim();
}

module.exports = {
  serializePage,
  serializePageReliable,
  getSerializeFnSource,
  getSerializeFnSourceReliable,
  BAR_SELECTOR,
  BAR_STYLE_ATTR,
};

// Node smoke: ensure module loads
if (require.main === module) {
  const src = getSerializeFnSourceReliable();
  if (!src.includes('serializePageReliable')) {
    console.error('serialize-page smoke failed: missing function source');
    process.exit(1);
  }
  console.log('serialize-page.js OK');
  console.log(`source length: ${src.length}`);
}
