/**
 * Component tree walker — React fiber when available, else DOM fallback.
 * Browser-safe core; Node module exports source for Playwright evaluate.
 */

'use strict';

/**
 * @param {object} [options]
 * @param {number} [options.maxDepth=25]
 * @returns {{ source: string, tree: object, text: string }}
 */
function exportComponentTree(options) {
  const opts = options || {};
  const maxDepth = typeof opts.maxDepth === 'number' ? opts.maxDepth : 25;

  const fiberRoot = findReactFiberRoot();
  if (fiberRoot) {
    const tree = walkFiber(fiberRoot, 0, maxDepth);
    return {
      source: 'react-fiber',
      tree,
      text: treeToText(tree, 0),
    };
  }

  const tree = walkDom(document.body, 0, maxDepth);
  return {
    source: 'dom-fallback',
    tree,
    text: treeToText(tree, 0),
  };
}

function findReactFiberRoot() {
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook && hook.renderers && hook.renderers.size) {
    try {
      for (const renderer of hook.renderers.values()) {
        const roots = hook.getFiberRoots && hook.getFiberRoots(renderer);
        if (roots && roots.size) {
          const root = roots.values().next().value;
          if (root && root.current) return root.current;
        }
      }
    } catch {
      /* fall through */
    }
  }

  // Probe DOM nodes for fiber keys
  const candidates = [document.getElementById('root'), document.getElementById('app'), document.body];
  for (const el of candidates) {
    if (!el) continue;
    const fiber = getFiberFromNode(el);
    if (fiber) return findRootFiber(fiber);
  }

  const all = document.body ? document.body.querySelectorAll('*') : [];
  for (let i = 0; i < Math.min(all.length, 50); i++) {
    const fiber = getFiberFromNode(all[i]);
    if (fiber) return findRootFiber(fiber);
  }
  return null;
}

function getFiberFromNode(node) {
  if (!node) return null;
  const keys = Object.keys(node);
  for (const key of keys) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
      return node[key];
    }
  }
  return null;
}

function findRootFiber(fiber) {
  let cur = fiber;
  while (cur.return) cur = cur.return;
  return cur;
}

function walkFiber(fiber, depth, maxDepth) {
  if (!fiber || depth > maxDepth) return null;

  let node = fiber;
  // Prefer composite (function/class) names
  const name = getFiberName(node);
  const children = [];

  let child = node.child;
  while (child) {
    const walked = walkFiber(child, depth + 1, maxDepth);
    if (walked) children.push(walked);
    child = child.sibling;
  }

  // Skip anonymous host wrappers with a single child to reduce noise
  if ((!name || name === 'Anonymous') && children.length === 1 && typeof node.type === 'string') {
    return children[0];
  }

  const result = { name: name || (typeof node.type === 'string' ? node.type : 'Anonymous') };
  if (children.length) result.children = children;

  const interesting = pickInterestingProps(node.memoizedProps);
  if (interesting) result.props = interesting;

  return result;
}

function getFiberName(fiber) {
  const t = fiber.type;
  if (!t) return fiber.elementType && fiber.elementType.name ? fiber.elementType.name : null;
  if (typeof t === 'string') return t;
  return t.displayName || t.name || null;
}

function pickInterestingProps(props) {
  if (!props || typeof props !== 'object') return null;
  const out = {};
  const keys = ['id', 'role', 'title', 'name', 'label', 'aria-label', 'data-ouia-component-id', 'variant', 'isOpen'];
  for (const k of keys) {
    if (props[k] != null && typeof props[k] !== 'function' && typeof props[k] !== 'object') {
      out[k] = props[k];
    }
  }
  // OUIA / data attrs
  for (const k of Object.keys(props)) {
    if (k.startsWith('data-') && typeof props[k] !== 'object') {
      out[k] = props[k];
    }
  }
  return Object.keys(out).length ? out : null;
}

function walkDom(el, depth, maxDepth) {
  if (!el || el.nodeType !== 1 || depth > maxDepth) return null;
  if (el.id === 'uxd-prototype-bar') return null;

  const name = el.tagName.toLowerCase();
  const props = {};
  if (el.id) props.id = el.id;
  const ouia = el.getAttribute('data-ouia-component-id');
  if (ouia) props['data-ouia-component-id'] = ouia;
  const role = el.getAttribute('role');
  if (role) props.role = role;
  const aria = el.getAttribute('aria-label');
  if (aria) props['aria-label'] = aria;
  const cls = el.getAttribute('class');
  if (cls && /pf-v\d-c-/.test(cls)) {
    const m = cls.match(/pf-v\d-c-[a-z0-9-]+/);
    if (m) props.pfClass = m[0];
  }

  const children = [];
  for (const child of Array.from(el.children)) {
    const walked = walkDom(child, depth + 1, maxDepth);
    if (walked) children.push(walked);
  }

  const result = { name };
  if (Object.keys(props).length) result.props = props;
  if (children.length) result.children = children;
  return result;
}

function treeToText(node, depth) {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  let line = indent + node.name;
  if (node.props) {
    const bits = Object.entries(node.props)
      .slice(0, 4)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    if (bits) line += ` (${bits})`;
  }
  const lines = [line];
  if (node.children) {
    for (const c of node.children) {
      lines.push(treeToText(c, depth + 1));
    }
  }
  return lines.join('\n');
}

function getExportTreeFnSource() {
  return `
function __uxdExportComponentTree(options) {
  ${findReactFiberRoot.toString()}
  ${getFiberFromNode.toString()}
  ${findRootFiber.toString()}
  ${walkFiber.toString()}
  ${getFiberName.toString()}
  ${pickInterestingProps.toString()}
  ${walkDom.toString()}
  ${treeToText.toString()}
  const exportComponentTree = ${exportComponentTree.toString()};
  return exportComponentTree(options);
}
__uxdExportComponentTree
`.trim();
}

module.exports = {
  exportComponentTree,
  getExportTreeFnSource,
  treeToText,
};

if (require.main === module) {
  const src = getExportTreeFnSource();
  if (!src.includes('exportComponentTree')) {
    console.error('export-component-tree smoke failed');
    process.exit(1);
  }
  console.log('export-component-tree.js OK');
  console.log(`source length: ${src.length}`);
}
