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

  function getBasePath() {
    var base = document.querySelector('base');
    if (base && base.getAttribute('href')) {
      return normalizePath(base.getAttribute('href'));
    }
    return '';
  }

  /** Candidate asset URLs respecting <base href> (Pages path prefix), then root-absolute. */
  function assetCandidates(relPaths) {
    var base = getBasePath();
    var out = [];
    (relPaths || []).forEach(function (p) {
      var clean = String(p || '').replace(/^\//, '');
      if (!clean) return;
      if (base && base !== '/') {
        out.push(base + '/' + clean);
      }
      out.push('/' + clean);
    });
    return out;
  }

  function loadScriptOnce(candidates, dataAttr, async) {
    if (document.querySelector('script[' + dataAttr + ']')) return;
    var i = 0;
    (function tryNext() {
      if (i >= candidates.length) return;
      var script = document.createElement('script');
      script.src = candidates[i++];
      script.setAttribute(dataAttr, 'true');
      script.async = async !== false;
      script.onerror = function () {
        script.remove();
        tryNext();
      };
      document.head.appendChild(script);
    })();
  }

  function applyPrototypeBarOffset(bar) {
    document.body.classList.add('uxd-prototype-bar-offset');
    function syncHeight() {
      var el = bar || document.getElementById('uxd-prototype-bar');
      if (!el) return;
      var h = el.getBoundingClientRect().height;
      if (h > 0) {
        document.documentElement.style.setProperty('--uxd-pb-height', Math.ceil(h) + 'px');
      }
    }
    syncHeight();
    if (typeof ResizeObserver !== 'undefined' && bar) {
      var ro = new ResizeObserver(syncHeight);
      ro.observe(bar);
    }
    window.addEventListener('resize', syncHeight);
  }

  function stripBasePath(pathname) {
    var bp = getBasePath();
    if (bp && bp !== '/' && pathname.indexOf(bp) === 0) {
      var stripped = pathname.slice(bp.length);
      return stripped ? (stripped.charAt(0) === '/' ? stripped : '/' + stripped) : '/';
    }
    return pathname;
  }

  function scenariosForPath(scenarios, pathname) {
    var path = normalizePath(stripBasePath(pathname));
    return (scenarios || []).filter(function (s) {
      return s && s.id && normalizePath(s.route || '') === path;
    });
  }

  var SCENARIO_UNAVAILABLE_HINT = 'No scenarios available for the current page';

  /**
   * Notify listeners when SPA navigations change the URL.
   * Covers popstate, pushState/replaceState wraps, and a light href poll
   * (fallback when another script re-wraps history and drops our hooks).
   */
  function onLocationChange(callback) {
    var lastHref = window.location.href;
    function notifyIfChanged() {
      var href = window.location.href;
      if (href === lastHref) return;
      lastHref = href;
      callback();
    }
    function notify() {
      lastHref = window.location.href;
      callback();
    }

    window.addEventListener('popstate', notify);
    window.addEventListener('hashchange', notify);

    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () {
      var ret = origPush.apply(this, arguments);
      notify();
      return ret;
    };
    history.replaceState = function () {
      var ret = origReplace.apply(this, arguments);
      notify();
      return ret;
    };

    // Fallback: catch navigations that bypass our history wrappers
    // (e.g. another module later replaces history.pushState entirely).
    var poll = window.setInterval(notifyIfChanged, 250);
    window.addEventListener('beforeunload', function () {
      window.clearInterval(poll);
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

  /** True when URL serves an eval report — not an SPA historyApiFallback shell. */
  async function looksLikeEvalReport(url) {
    try {
      var res = await fetch(url, { method: 'GET', credentials: 'same-origin' });
      if (!res.ok) return false;
      var ct = res.headers.get('content-type') || '';
      if (ct && !/text\/html/i.test(ct) && !/application\/json/i.test(ct)) return false;
      if (/application\/json/i.test(ct)) return false;
      var head = (await res.text()).slice(0, 12000);
      if (/data-uxd-eval-report/i.test(head)) return true;
      if (/data-uxd-view=["']eval["']/i.test(head)) return true;
      if (/<title>\s*Evaluation:/i.test(head)) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  /** Same-origin eval paths under <base href> (e.g. /mr-218/) then site root. */
  function evalUrlCandidates(fallback, id) {
    var out = [];
    function push(u) {
      if (u && out.indexOf(u) === -1) out.push(u);
    }
    var base = getBasePath(); // normalizePath'd; no trailing slash unless root
    var fromConfig = String(fallback || '')
      .replace(/^\//, '')
      .replace(/\/?$/, '/');
    if (base && base !== '/') push(base + '/' + fromConfig);
    push('/' + fromConfig);
    if (id) {
      var conventional = 'evals/' + encodeURIComponent(id) + '/';
      if (base && base !== '/') push(base + '/' + conventional);
      push('/' + conventional);
    }
    return out;
  }

  function isLocalHostUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(url);
  }

  function isRunningOnLocalHost() {
    try {
      return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    } catch (e) {
      return false;
    }
  }

  async function resolveEvalUrl(cfg) {
    var id = cfg.id;
    if (id && (await helperHealthy())) {
      var helperUrl = HELPER + '/evals/' + encodeURIComponent(id) + '/';
      if (await looksLikeEvalReport(helperUrl)) return helperUrl;
    }
    var fallback = cfg.views && cfg.views.eval;
    if (!fallback) return null;
    if (/^https?:\/\//i.test(fallback)) return fallback;
    // Relative paths: try Pages path_prefix first (/mr-218/evals/…), then site-root /evals/…
    var candidates = evalUrlCandidates(fallback, id);
    for (var i = 0; i < candidates.length; i++) {
      if (await looksLikeEvalReport(candidates[i])) return candidates[i];
    }
    return null;
  }

  function evalUnavailableHint(cfg) {
    if (isRunningOnLocalHost()) {
      return 'Eval report not available yet — for local viewing, run export-helper on :9417';
    }
    var id = (cfg && cfg.id) || '…';
    var base = getBasePath();
    var prefix = base && base !== '/' ? base + '/' : '/';
    return 'Eval report not available on this deployment (expected ' + prefix + 'evals/' + id + '/)';
  }

  var RETURN_URL_KEY = 'uxd-prototype-return-url';

  function rememberPrototypeReturnUrl() {
    try {
      if (detectActiveView() !== 'prototype') return;
      sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
    } catch (e) {
      /* private mode / blocked storage */
    }
  }

  function resolvePrototypeUrl(cfg) {
    var configured = cfg.views && cfg.views.prototype;
    // Ignore stale localhost URLs baked in during create when viewing on Pages
    if (configured && !(isLocalHostUrl(configured) && !isRunningOnLocalHost())) {
      return configured;
    }
    try {
      var stored = sessionStorage.getItem(RETURN_URL_KEY);
      if (stored) return stored;
    } catch (e) {
      /* ignore */
    }
    try {
      var ref = document.referrer;
      if (ref && !/\/evals\//.test(ref)) return ref;
    } catch (e) {
      /* ignore */
    }
    var base = getBasePath();
    return base && base !== '/' ? base + '/' : '/';
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

  /** Load serialize-page.browser.js when missing (Pages / inject without script tags). */
  async function ensureExportRuntime() {
    if (window.UxdPrototypeExport && window.UxdPrototypeExport.exportStaticHtml) return;
    loadScriptOnce(
      assetCandidates([
        'uxd-prototype-bar/serialize-page.browser.js',
        'serialize-page.browser.js',
      ]),
      'data-uxd-serialize-bundle',
      true
    );
    await waitForExport();
  }

  /** Load export-pf-spec.browser.js when missing. */
  async function ensurePfSpecRuntime() {
    if (window.UxdPrototypeExport && window.UxdPrototypeExport.exportPfSpecFiles) return;
    loadScriptOnce(
      assetCandidates([
        'uxd-prototype-bar/export-pf-spec.browser.js',
        'export-pf-spec.browser.js',
      ]),
      'data-uxd-pf-spec-bundle',
      true
    );
    var start = Date.now();
    while (
      !(window.UxdPrototypeExport && window.UxdPrototypeExport.exportPfSpecFiles) &&
      Date.now() - start < 5000
    ) {
      await new Promise(function (r) {
        setTimeout(r, 50);
      });
    }
    if (!(window.UxdPrototypeExport && window.UxdPrototypeExport.exportPfSpecFiles)) {
      throw new Error('PF spec runtime not loaded (export-pf-spec.browser.js)');
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

  function syncScenarioControls(scenarioBtn, scenarioMenu, scenarioWrap, activeView) {
    var cfg = getConfig();
    var pathname = (window.location && window.location.pathname) || '/';
    var pageScenarios = scenariosForPath(cfg.scenarios, pathname);
    var activeScenario = getActiveScenarioId();
    var enabled = activeView === 'prototype' && pageScenarios.length > 1;

    if (activeView !== 'prototype') {
      scenarioWrap.style.display = 'none';
      scenarioMenu.setAttribute('hidden', 'true');
      return;
    }

    scenarioWrap.style.display = '';
    scenarioBtn.disabled = !enabled;
    if (enabled) {
      scenarioBtn.setAttribute('aria-haspopup', 'menu');
      var match = pageScenarios.filter(function (s) {
        return s.id === activeScenario;
      })[0];
      scenarioBtn.title = (match && match.name) || activeScenario;
      buildScenarioMenu(pageScenarios, activeScenario, scenarioMenu);
    } else {
      scenarioBtn.removeAttribute('aria-haspopup');
      scenarioBtn.title = SCENARIO_UNAVAILABLE_HINT;
      scenarioMenu.setAttribute('hidden', 'true');
      scenarioMenu.innerHTML = '';
    }
  }

  async function mount() {
    var cfg = getConfig();
    var active = detectActiveView();

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
      text: 'Scenario ▾',
      onclick: function () {
        if (scenarioBtn.disabled) return;
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
    syncScenarioControls(scenarioBtn, scenarioMenu, scenarioWrap, active);
    onLocationChange(function () {
      syncScenarioControls(scenarioBtn, scenarioMenu, scenarioWrap, detectActiveView());
    });

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
            setStatus(evalUnavailableHint(getConfig()));
            return;
          }
          if (active === 'eval') {
            setStatus('Viewing eval');
            return;
          }
          rememberPrototypeReturnUrl();
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
        evalBtn.title = evalUnavailableHint(cfg);
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
              await ensureExportRuntime();
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
              await ensureExportRuntime();
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
      el('li', { role: 'none' }, [
        el('button', {
          type: 'button',
          role: 'menuitem',
          text: 'PF implementation spec',
          onclick: async function () {
            exportMenu.setAttribute('hidden', 'true');
            exportBtn.disabled = true;
            setStatus('Exporting PF implementation spec…');
            try {
              await ensureExportRuntime();
              await ensurePfSpecRuntime();
              var result = await window.UxdPrototypeExport.exportPfSpecFiles();
              var method = result.delivery && result.delivery[0] && result.delivery[0].method;
              var scenario = result.scenarioId ? ' · ' + result.scenarioId : '';
              setStatus(
                method === 'helper'
                  ? 'Saved PF spec' + scenario
                  : 'Downloaded PF spec' + scenario
              );
              if (result.warnings && result.warnings.length) {
                console.warn('[uxd-prototype-export] pf-spec', result.warnings);
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
    applyPrototypeBarOffset(bar);

    // Eagerly load export runtime so Export works on static hosts (no helper).
    if (active !== 'eval') {
      if (!(window.UxdPrototypeExport && window.UxdPrototypeExport.exportStaticHtml)) {
        loadScriptOnce(
          assetCandidates([
            'uxd-prototype-bar/serialize-page.browser.js',
            'serialize-page.browser.js',
          ]),
          'data-uxd-serialize-bundle',
          true
        );
      }
      if (!(window.UxdPrototypeExport && window.UxdPrototypeExport.exportPfSpecFiles)) {
        loadScriptOnce(
          assetCandidates([
            'uxd-prototype-bar/export-pf-spec.browser.js',
            'export-pf-spec.browser.js',
          ]),
          'data-uxd-pf-spec-bundle',
          true
        );
      }
    }
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
