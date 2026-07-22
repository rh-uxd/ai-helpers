/**
 * Standalone Prototype Bar injector (no React required).
 * Reads window.__UXD_PROTOTYPE__ for Sources + Prototype|Eval + Scenario.
 * Expects window.UxdPrototypeExport from serialize-page.browser.js.
 * Expects window.UxdScenario from uxd-scenario-runtime.js (optional fallback).
 */
(function () {
  'use strict';

  if (document.getElementById('uxd-prototype-bar')) return;

  var HELPER = 'http://127.0.0.1:9417';

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

  function getConfig() {
    return window.__UXD_PROTOTYPE__ || {};
  }

  function setStatus(text) {
    var s = document.querySelector('#uxd-prototype-bar .uxd-pb-status');
    if (s) s.textContent = text || '';
  }

  function detectActiveView() {
    var path = (window.location && window.location.pathname) || '';
    if (/\/evals\//.test(path) || document.documentElement.getAttribute('data-uxd-view') === 'eval') {
      return 'eval';
    }
    return 'prototype';
  }

  function normalizePath(p) {
    if (!p) return '/';
    var noQuery = String(p).split('?')[0].split('#')[0];
    if (noQuery.length > 1 && noQuery.charAt(noQuery.length - 1) === '/') {
      return noQuery.slice(0, -1);
    }
    return noQuery || '/';
  }

  function scenariosForPath(scenarios, pathname) {
    var path = normalizePath(pathname);
    return (scenarios || []).filter(function (s) {
      return s && s.id && normalizePath(s.route || '') === path;
    });
  }

  function getActiveScenarioId() {
    if (window.UxdScenario) return window.UxdScenario.get();
    try {
      return new URLSearchParams(window.location.search).get('scenario') || 'default';
    } catch (e) {
      return 'default';
    }
  }

  function selectScenario(id) {
    if (window.UxdScenario) {
      window.UxdScenario.set(id);
      return;
    }
    var url = new URL(window.location.href);
    if (id === 'default') url.searchParams.delete('scenario');
    else url.searchParams.set('scenario', id);
    window.location.assign(url.toString());
  }

  async function helperHealthy() {
    try {
      var res = await fetch(HELPER + '/health', { method: 'GET' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function resolveEvalUrl(cfg) {
    var id = cfg.id;
    if (id && (await helperHealthy())) {
      return HELPER + '/evals/' + encodeURIComponent(id) + '/';
    }
    if (cfg.views && cfg.views.eval) return cfg.views.eval;
    return null;
  }

  function resolvePrototypeUrl(cfg) {
    if (cfg.views && cfg.views.prototype) return cfg.views.prototype;
    return '/';
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

  function kindLabel(kind) {
    var map = {
      outcome: 'Outcome',
      rfe: 'RFE',
      strat: 'Strat',
      figma: 'Figma',
      description: 'Desc',
      idea: 'Idea',
      other: 'Source',
    };
    return map[kind] || 'Source';
  }

  function buildSourcesMenu(cfg, menu) {
    menu.innerHTML = '';
    var sources = (cfg.sources || []).filter(Boolean);
    if (cfg.title || cfg.id) {
      menu.appendChild(
        el('li', {
          class: 'uxd-pb-sources-title',
          role: 'presentation',
          text: (cfg.title || cfg.id) + (cfg.title && cfg.id ? ' · ' + cfg.id : ''),
        })
      );
    }
    if (!sources.length) {
      menu.appendChild(el('li', { role: 'none' }, [
        el('span', { class: 'uxd-pb-source-muted', text: 'No sources', style: 'display:block;padding:0.4rem 0.75rem' }),
      ]));
      return;
    }
    sources.forEach(function (s) {
      var label = s.key || s.label || 'Source';
      var kind = kindLabel(s.kind);
      if (s.url) {
        menu.appendChild(
          el('li', { role: 'none' }, [
            el(
              'a',
              {
                class: 'uxd-pb-source-link',
                href: s.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                role: 'menuitem',
              },
              [
                el('span', { class: 'uxd-pb-source-kind', text: kind }),
                el('span', { class: 'uxd-pb-source-label', text: label }),
              ]
            ),
          ])
        );
      } else {
        menu.appendChild(
          el('li', { role: 'none' }, [
            el('span', { class: 'uxd-pb-source-link uxd-pb-source-muted', role: 'menuitem' }, [
              el('span', { class: 'uxd-pb-source-kind', text: kind }),
              el('span', { class: 'uxd-pb-source-label', text: label }),
            ]),
          ])
        );
      }
    });
  }

  function buildScenarioMenu(pageScenarios, activeId, menu) {
    menu.innerHTML = '';
    pageScenarios.forEach(function (s) {
      var label = s.name || s.id;
      menu.appendChild(
        el('li', { role: 'none' }, [
          el('button', {
            type: 'button',
            role: 'menuitem',
            'aria-current': s.id === activeId ? 'true' : 'false',
            text: label + (s.id === activeId ? ' ✓' : ''),
            onclick: function () {
              menu.setAttribute('hidden', 'true');
              setStatus('Scenario: ' + s.id);
              selectScenario(s.id);
            },
          }),
        ])
      );
    });
  }

  async function mount() {
    var cfg = getConfig();
    var active = detectActiveView();
    var pathname = (window.location && window.location.pathname) || '/';
    var pageScenarios = scenariosForPath(cfg.scenarios, pathname);
    var activeScenario = getActiveScenarioId();
    var showScenario = active === 'prototype' && pageScenarios.length > 1;

    var sourcesMenu = el('ul', {
      class: 'uxd-pb-menu uxd-pb-sources-menu',
      role: 'menu',
      hidden: 'true',
    });
    buildSourcesMenu(cfg, sourcesMenu);

    var scenarioMenu = el('ul', {
      class: 'uxd-pb-menu uxd-pb-scenario-menu',
      role: 'menu',
      hidden: 'true',
    });
    if (showScenario) {
      buildScenarioMenu(pageScenarios, activeScenario, scenarioMenu);
    }

    var sourcesBtn = el('button', {
      type: 'button',
      class: 'uxd-pb-btn',
      'aria-haspopup': 'menu',
      text: 'Sources ▾',
      onclick: function () {
        if (sourcesMenu.hasAttribute('hidden')) {
          exportMenu.setAttribute('hidden', 'true');
          scenarioMenu.setAttribute('hidden', 'true');
          sourcesMenu.removeAttribute('hidden');
        } else {
          sourcesMenu.setAttribute('hidden', 'true');
        }
      },
    });
    var sourcesWrap = el('div', { class: 'uxd-pb-sources-wrap' }, [sourcesBtn, sourcesMenu]);
    if (!(cfg.sources && cfg.sources.length)) {
      sourcesWrap.style.display = 'none';
    }

    var scenarioBtn = el('button', {
      type: 'button',
      class: 'uxd-pb-btn',
      'aria-haspopup': 'menu',
      text: 'Scenario ▾',
      onclick: function () {
        if (scenarioMenu.hasAttribute('hidden')) {
          exportMenu.setAttribute('hidden', 'true');
          sourcesMenu.setAttribute('hidden', 'true');
          scenarioMenu.removeAttribute('hidden');
        } else {
          scenarioMenu.setAttribute('hidden', 'true');
        }
      },
    });
    var scenarioWrap = el('div', { class: 'uxd-pb-scenario-wrap' }, [scenarioBtn, scenarioMenu]);
    if (!showScenario) {
      scenarioWrap.style.display = 'none';
    }

    var protoBtn = el('button', {
      type: 'button',
      text: 'Prototype',
      'aria-current': active === 'prototype' ? 'true' : 'false',
      onclick: function () {
        var url = resolvePrototypeUrl(getConfig());
        if (active === 'prototype' && (!url || url === '/' || url === window.location.pathname)) {
          setStatus('Viewing prototype');
          return;
        }
        window.location.href = url;
      },
    });

    var evalBtn = el('button', {
      type: 'button',
      text: 'Eval',
      'aria-current': active === 'eval' ? 'true' : 'false',
      onclick: async function () {
        evalBtn.disabled = true;
        setStatus('Opening eval…');
        try {
          var url = await resolveEvalUrl(getConfig());
          if (!url) {
            setStatus('Eval report not available yet');
            return;
          }
          if (active === 'eval') {
            setStatus('Viewing eval');
            return;
          }
          window.location.href = url;
        } finally {
          evalBtn.disabled = false;
        }
      },
    });

    (async function () {
      var url = await resolveEvalUrl(cfg);
      if (!url && active !== 'eval') {
        evalBtn.disabled = true;
        evalBtn.title = 'Eval report not available yet';
      }
    })();

    var views = el('div', { class: 'uxd-pb-views', role: 'group', 'aria-label': 'View switch' }, [
      protoBtn,
      evalBtn,
    ]);

    var exportMenu = el('ul', { class: 'uxd-pb-menu', role: 'menu', hidden: 'true' }, [
      el('li', { role: 'none' }, [
        el('button', {
          type: 'button',
          role: 'menuitem',
          text: 'Static HTML',
          onclick: async function () {
            exportMenu.setAttribute('hidden', 'true');
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
            exportMenu.setAttribute('hidden', 'true');
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
        if (exportMenu.hasAttribute('hidden')) {
          sourcesMenu.setAttribute('hidden', 'true');
          scenarioMenu.setAttribute('hidden', 'true');
          exportMenu.removeAttribute('hidden');
        } else {
          exportMenu.setAttribute('hidden', 'true');
        }
      },
    });

    var exportWrap = el('div', { class: 'uxd-pb-export-wrap' }, [exportBtn, exportMenu]);

    if (active === 'eval') {
      exportWrap.style.display = 'none';
    }

    var bar = el('div', { id: 'uxd-prototype-bar', role: 'region', 'aria-label': 'Prototype bar' }, [
      el('div', { class: 'uxd-pb-left' }, [
        el('span', { class: 'uxd-pb-brand', text: 'Prototype' }),
        sourcesWrap,
      ]),
      el('div', { class: 'uxd-pb-controls' }, [views, scenarioWrap, exportWrap]),
      el('span', { class: 'uxd-pb-status', 'aria-live': 'polite' }),
    ]);

    document.addEventListener('mousedown', function (e) {
      if (!exportWrap.contains(e.target)) exportMenu.setAttribute('hidden', 'true');
      if (!sourcesWrap.contains(e.target)) sourcesMenu.setAttribute('hidden', 'true');
      if (!scenarioWrap.contains(e.target)) scenarioMenu.setAttribute('hidden', 'true');
    });

    var body = document.body;
    if (body.firstChild) body.insertBefore(bar, body.firstChild);
    else body.appendChild(bar);
  }

  function start() {
    var startAt = Date.now();
    (function waitCfg() {
      if (window.__UXD_PROTOTYPE__ || Date.now() - startAt > 300) {
        mount();
      } else {
        setTimeout(waitCfg, 30);
      }
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
