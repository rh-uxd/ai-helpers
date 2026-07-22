/**
 * Standalone Prototype Bar injector (no React required).
 * Expects window.UxdPrototypeExport from serialize-page.browser.js.
 */
(function () {
  'use strict';

  if (document.getElementById('uxd-prototype-bar')) return;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function setStatus(text) {
    var s = document.querySelector('#uxd-prototype-bar .uxd-pb-status');
    if (s) s.textContent = text || '';
  }

  async function waitForExport() {
    var start = Date.now();
    while (!window.UxdPrototypeExport && Date.now() - start < 5000) {
      await new Promise(function (r) {
        setTimeout(r, 50);
      });
    }
    if (!window.UxdPrototypeExport) {
      throw new Error('Export runtime not loaded');
    }
  }

  function mount() {
    var menu = el('ul', { class: 'uxd-pb-menu', role: 'menu', hidden: 'true' }, [
      el('li', { role: 'none' }, [
        el('button', {
          type: 'button',
          role: 'menuitem',
          text: 'Static HTML',
          onclick: async function () {
            menu.setAttribute('hidden', 'true');
            exportBtn.disabled = true;
            setStatus('Exporting HTML…');
            try {
              await waitForExport();
              var result = await window.UxdPrototypeExport.exportStaticHtml();
              setStatus(
                result.delivery && result.delivery.method === 'helper'
                  ? 'Saved ' + result.delivery.path
                  : 'Downloaded HTML'
              );
              if (result.warnings && result.warnings.length) {
                console.warn('[uxd-prototype-export]', result.warnings);
              }
            } catch (err) {
              console.error(err);
              setStatus(err.message || 'Export failed');
            } finally {
              exportBtn.disabled = false;
            }
          },
        }),
      ]),
      el('li', { role: 'none' }, [
        el('button', {
          type: 'button',
          role: 'menuitem',
          text: 'Component tree',
          onclick: async function () {
            menu.setAttribute('hidden', 'true');
            exportBtn.disabled = true;
            setStatus('Exporting component tree…');
            try {
              await waitForExport();
              var result = await window.UxdPrototypeExport.exportTree();
              var method = result.delivery && result.delivery[0] && result.delivery[0].method;
              setStatus(
                method === 'helper'
                  ? 'Saved tree (' + (result.source || '') + ')'
                  : 'Downloaded tree (' + (result.source || 'unknown') + ')'
              );
            } catch (err) {
              console.error(err);
              setStatus(err.message || 'Export failed');
            } finally {
              exportBtn.disabled = false;
            }
          },
        }),
      ]),
    ]);

    var exportBtn = el('button', {
      type: 'button',
      class: 'uxd-pb-btn',
      'aria-haspopup': 'menu',
      text: 'Export ▾',
      onclick: function () {
        if (menu.hasAttribute('hidden')) menu.removeAttribute('hidden');
        else menu.setAttribute('hidden', 'true');
      },
    });

    var wrap = el('div', { class: 'uxd-pb-export-wrap' }, [exportBtn, menu]);
    var bar = el('div', { id: 'uxd-prototype-bar', role: 'region', 'aria-label': 'Prototype bar' }, [
      el('span', { class: 'uxd-pb-brand', text: 'Prototype' }),
      el('div', { class: 'uxd-pb-controls' }, [wrap]),
      el('span', { class: 'uxd-pb-status', 'aria-live': 'polite' }),
    ]);

    document.addEventListener('mousedown', function (e) {
      if (!wrap.contains(e.target)) menu.setAttribute('hidden', 'true');
    });

    var body = document.body;
    if (body.firstChild) body.insertBefore(bar, body.firstChild);
    else body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
