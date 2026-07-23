/**
 * Browser bundle for Prototype Bar — attaches window.UxdPrototypeExport.
 * Keep in sync with scripts/serialize-page.js + export-component-tree.js.
 */
(function (global) {
  'use strict';

  var BAR_SELECTOR = '#uxd-prototype-bar';
  var BAR_STYLE_ATTR = 'data-uxd-prototype-bar-style';
  var HELPER_ORIGIN = 'http://127.0.0.1:9417';

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function inlineSameOriginImages(cloneRoot, liveDoc, warnings) {
    var imgs = Array.from(cloneRoot.querySelectorAll('img[src]'));
    var origin = liveDoc.defaultView.location.origin;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.getAttribute('src');
      if (!src || src.indexOf('data:') === 0) continue;
      var abs;
      try {
        abs = new URL(src, liveDoc.baseURI).href;
      } catch (e) {
        continue;
      }
      if (abs.indexOf(origin) !== 0) {
        warnings.push('Left cross-origin image as URL: ' + abs);
        continue;
      }
      try {
        var res = await fetch(abs, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var blob = await res.blob();
        img.setAttribute('src', await blobToDataUrl(blob));
      } catch (err) {
        warnings.push('Could not inline image: ' + abs + ' (' + (err.message || err) + ')');
      }
    }
  }

  async function serializePage(options) {
    options = options || {};
    var inlineImages = options.inlineImages !== false;
    var warnings = [];
    var tagged = [];

    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      var idx = 0;
      var node = walker.currentNode;
      while (node && idx < 400) {
        if (node.nodeType === 1 && !node.closest(BAR_SELECTOR)) {
          var cs = window.getComputedStyle(node);
          if (cs.display !== 'none') {
            var id = 'uxd-ex-' + idx;
            node.setAttribute('data-uxd-export-id', id);
            tagged.push({
              id: id,
              css:
                'display:' +
                cs.display +
                ';position:' +
                cs.position +
                ';color:' +
                cs.color +
                ';background-color:' +
                cs.backgroundColor +
                ';font-size:' +
                cs.fontSize +
                ';font-weight:' +
                cs.fontWeight +
                ';font-family:' +
                cs.fontFamily +
                ';margin:' +
                cs.margin +
                ';padding:' +
                cs.padding +
                ';border:' +
                cs.border +
                ';width:' +
                cs.width +
                ';height:' +
                cs.height +
                ';flex:' +
                cs.flex +
                ';gap:' +
                cs.gap +
                ';text-align:' +
                cs.textAlign +
                ';',
            });
            idx += 1;
          }
        }
        node = walker.nextNode();
      }
    } catch (err) {
      warnings.push('Pre-tag failed: ' + (err.message || err));
    }

    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll(BAR_SELECTOR).forEach(function (el) {
      el.remove();
    });
    clone.querySelectorAll('[' + BAR_STYLE_ATTR + ']').forEach(function (el) {
      el.remove();
    });
    clone.querySelectorAll('script[data-uxd-prototype-bar]').forEach(function (el) {
      el.remove();
    });
    clone.querySelectorAll('script').forEach(function (el) {
      el.remove();
    });

    var styleChunks = [];
    var linkNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    var stylesheetOk = 0;
    for (var li = 0; li < linkNodes.length; li++) {
      var href = linkNodes[li].href;
      try {
        var cres = await fetch(href, { credentials: 'include', mode: 'cors' }).catch(function () {
          return fetch(href, { credentials: 'same-origin' });
        });
        if (!cres.ok) throw new Error('HTTP ' + cres.status);
        styleChunks.push('/* ' + href + ' */\n' + (await cres.text()));
        stylesheetOk += 1;
      } catch (err) {
        warnings.push('Could not inline stylesheet: ' + href + ' (' + (err.message || err) + ')');
      }
    }

    clone.querySelectorAll('link[rel="stylesheet"]').forEach(function (el) {
      el.remove();
    });

    if (stylesheetOk === 0 && tagged.length) {
      styleChunks.push(
        '/* computed-style fallback */\n' +
          tagged
            .map(function (t) {
              return '[data-uxd-export-id="' + t.id + '"]{' + t.css + '}';
            })
            .join('\n')
      );
    }

    if (styleChunks.length) {
      var styleEl = document.createElement('style');
      styleEl.setAttribute('data-uxd-export-inlined', 'true');
      styleEl.textContent = styleChunks.join('\n\n');
      var head = clone.querySelector('head');
      if (head) head.insertBefore(styleEl, head.firstChild);
      else clone.insertBefore(styleEl, clone.firstChild);
    }

    if (inlineImages) {
      await inlineSameOriginImages(clone, document, warnings);
    }

    tagged.forEach(function (t) {
      var el = document.querySelector('[data-uxd-export-id="' + t.id + '"]');
      if (el) el.removeAttribute('data-uxd-export-id');
    });

    var doctype = document.doctype ? '<!DOCTYPE ' + document.doctype.name + '>' : '<!DOCTYPE html>';
    return { html: doctype + '\n' + clone.outerHTML, warnings: warnings };
  }

  function getFiberFromNode(node) {
    if (!node) return null;
    var keys = Object.keys(node);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.indexOf('__reactFiber$') === 0 || key.indexOf('__reactInternalInstance$') === 0) {
        return node[key];
      }
    }
    return null;
  }

  function findRootFiber(fiber) {
    var cur = fiber;
    while (cur.return) cur = cur.return;
    return cur;
  }

  function findReactFiberRoot() {
    var hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.renderers && hook.renderers.size) {
      try {
        var renderers = hook.renderers.values();
        for (var r = renderers.next(); !r.done; r = renderers.next()) {
          var roots = hook.getFiberRoots && hook.getFiberRoots(r.value);
          if (roots && roots.size) {
            var root = roots.values().next().value;
            if (root && root.current) return root.current;
          }
        }
      } catch (e) {
        /* fall through */
      }
    }
    var candidates = [document.getElementById('root'), document.getElementById('app'), document.body];
    for (var c = 0; c < candidates.length; c++) {
      var fiber = getFiberFromNode(candidates[c]);
      if (fiber) return findRootFiber(fiber);
    }
    var all = document.body ? document.body.querySelectorAll('*') : [];
    for (var i = 0; i < Math.min(all.length, 50); i++) {
      var f = getFiberFromNode(all[i]);
      if (f) return findRootFiber(f);
    }
    return null;
  }

  function getFiberName(fiber) {
    var t = fiber.type;
    if (!t) return fiber.elementType && fiber.elementType.name ? fiber.elementType.name : null;
    if (typeof t === 'string') return t;
    return t.displayName || t.name || null;
  }

  function pickInterestingProps(props) {
    if (!props || typeof props !== 'object') return null;
    var out = {};
    var keys = ['id', 'role', 'title', 'name', 'label', 'aria-label', 'data-ouia-component-id', 'variant', 'isOpen'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (props[k] != null && typeof props[k] !== 'function' && typeof props[k] !== 'object') out[k] = props[k];
    }
    Object.keys(props).forEach(function (k) {
      if (k.indexOf('data-') === 0 && typeof props[k] !== 'object') out[k] = props[k];
    });
    return Object.keys(out).length ? out : null;
  }

  function walkFiber(fiber, depth, maxDepth) {
    if (!fiber || depth > maxDepth) return null;
    var name = getFiberName(fiber);
    var children = [];
    var child = fiber.child;
    while (child) {
      var walked = walkFiber(child, depth + 1, maxDepth);
      if (walked) children.push(walked);
      child = child.sibling;
    }
    if ((!name || name === 'Anonymous') && children.length === 1 && typeof fiber.type === 'string') {
      return children[0];
    }
    var result = { name: name || (typeof fiber.type === 'string' ? fiber.type : 'Anonymous') };
    if (children.length) result.children = children;
    var interesting = pickInterestingProps(fiber.memoizedProps);
    if (interesting) result.props = interesting;
    return result;
  }

  function walkDom(el, depth, maxDepth) {
    if (!el || el.nodeType !== 1 || depth > maxDepth) return null;
    if (el.id === 'uxd-prototype-bar') return null;
    var name = el.tagName.toLowerCase();
    var props = {};
    if (el.id) props.id = el.id;
    var ouia = el.getAttribute('data-ouia-component-id');
    if (ouia) props['data-ouia-component-id'] = ouia;
    var role = el.getAttribute('role');
    if (role) props.role = role;
    var aria = el.getAttribute('aria-label');
    if (aria) props['aria-label'] = aria;
    var cls = el.getAttribute('class');
    if (cls && /pf-v\d-c-/.test(cls)) {
      var m = cls.match(/pf-v\d-c-[a-z0-9-]+/);
      if (m) props.pfClass = m[0];
    }
    var children = [];
    for (var i = 0; i < el.children.length; i++) {
      var walked = walkDom(el.children[i], depth + 1, maxDepth);
      if (walked) children.push(walked);
    }
    var result = { name: name };
    if (Object.keys(props).length) result.props = props;
    if (children.length) result.children = children;
    return result;
  }

  function treeToText(node, depth) {
    if (!node) return '';
    var indent = '';
    for (var d = 0; d < depth; d++) indent += '  ';
    var line = indent + node.name;
    if (node.props) {
      var bits = Object.keys(node.props)
        .slice(0, 4)
        .map(function (k) {
          return k + '=' + JSON.stringify(node.props[k]);
        })
        .join(' ');
      if (bits) line += ' (' + bits + ')';
    }
    var lines = [line];
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        lines.push(treeToText(node.children[i], depth + 1));
      }
    }
    return lines.join('\n');
  }

  function exportComponentTree(options) {
    options = options || {};
    var maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : 25;
    var fiberRoot = findReactFiberRoot();
    if (fiberRoot) {
      var tree = walkFiber(fiberRoot, 0, maxDepth);
      return { source: 'react-fiber', tree: tree, text: treeToText(tree, 0) };
    }
    var domTree = walkDom(document.body, 0, maxDepth);
    return { source: 'dom-fallback', tree: domTree, text: treeToText(domTree, 0) };
  }

  function downloadBlob(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
  }

  async function helperHealthy() {
    try {
      var res = await fetch(HELPER_ORIGIN + '/health', { method: 'GET', mode: 'cors' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function deliverExport(filename, body, format) {
    var healthy = await helperHealthy();
    if (healthy) {
      try {
        var res = await fetch(HELPER_ORIGIN + '/export', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: filename, body: body, format: format }),
        });
        if (res.ok) {
          var data = await res.json().catch(function () {
            return {};
          });
          return { method: 'helper', path: data.path || filename };
        }
      } catch (e) {
        /* fall through to download */
      }
    }
    var mime =
      format === 'html'
        ? 'text/html;charset=utf-8'
        : format === 'json'
          ? 'application/json;charset=utf-8'
          : 'text/plain;charset=utf-8';
    downloadBlob(filename, body, mime);
    return { method: 'download', path: filename };
  }

  function slugFromPath() {
    var path = (location.pathname || 'page').replace(/\/+$/, '') || 'page';
    var slug = path
      .split('/')
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'page';
  }

  function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  async function exportStaticHtml() {
    var result = await serializePage({ inlineImages: true });
    var filename = 'current/' + slugFromPath() + '-' + timestamp() + '.html';
    var delivery = await deliverExport(filename, result.html, 'html');
    return { warnings: result.warnings, delivery: delivery };
  }

  async function exportTree() {
    var result = exportComponentTree({});
    var base = 'current/' + slugFromPath() + '-' + timestamp();
    var jsonBody = JSON.stringify({ source: result.source, tree: result.tree }, null, 2);
    var d1 = await deliverExport(base + '.tree.json', jsonBody, 'json');
    var d2 = await deliverExport(base + '.tree.txt', result.text, 'txt');
    return { source: result.source, delivery: [d1, d2] };
  }

  global.UxdPrototypeExport = {
    serializePage: serializePage,
    exportComponentTree: exportComponentTree,
    exportStaticHtml: exportStaticHtml,
    exportTree: exportTree,
    deliverExport: deliverExport,
    helperHealthy: helperHealthy,
    HELPER_ORIGIN: HELPER_ORIGIN,
  };
})(typeof window !== 'undefined' ? window : globalThis);
