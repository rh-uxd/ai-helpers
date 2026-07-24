import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type UxdPrototypeSource = {
  kind?: string;
  key?: string;
  label?: string;
  url?: string;
};

export type UxdBarScenario = {
  route?: string;
  id: string;
  name?: string;
  default?: boolean;
};

export type UxdPrototypeConfig = {
  id?: string;
  title?: string;
  jiraBaseUrl?: string;
  sources?: UxdPrototypeSource[];
  scenarios?: UxdBarScenario[];
  views?: {
    prototype?: string | null;
    eval?: string | null;
  };
};

declare global {
  interface Window {
    __UXD_PROTOTYPE__?: UxdPrototypeConfig;
    UxdScenario?: {
      get: () => string;
      set: (id: string) => void;
      subscribe: (cb: (id: string) => void) => () => void;
      DEFAULT_ID?: string;
    };
    UxdPrototypeExport?: {
      exportStaticHtml: () => Promise<{
        warnings?: string[];
        delivery?: { method: string; path: string };
      }>;
      exportTree: () => Promise<{
        source?: string;
        delivery?: Array<{ method: string; path: string }>;
      }>;
      exportPfSpecFiles?: () => Promise<{
        source?: string;
        scenarioId?: string;
        delivery?: Array<{ method: string; path: string }>;
        warnings?: Array<string | { message?: string }>;
      }>;
    };
  }
}

const HELPER = 'http://127.0.0.1:9417';

function kindLabel(kind?: string): string {
  const map: Record<string, string> = {
    outcome: 'Outcome',
    rfe: 'RFE',
    strat: 'Strat',
    figma: 'Figma',
    description: 'Desc',
    idea: 'Idea',
    other: 'Source',
  };
  return map[kind || ''] || 'Source';
}

function detectActiveView(): 'prototype' | 'eval' {
  const path = window.location?.pathname || '';
  if (/\/evals\//.test(path) || document.documentElement.getAttribute('data-uxd-view') === 'eval') {
    return 'eval';
  }
  return 'prototype';
}

function normalizePath(p: string): string {
  if (!p) return '/';
  const noQuery = p.split('?')[0].split('#')[0];
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1);
  return noQuery || '/';
}

const SCENARIO_UNAVAILABLE_HINT = 'No scenarios available for the current page';

async function helperHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${HELPER}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** True when URL serves an eval report — not an SPA historyApiFallback shell. */
async function looksLikeEvalReport(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'same-origin' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (ct && !/text\/html/i.test(ct) && !/application\/json/i.test(ct)) return false;
    // Helper returns JSON 404 payloads for missing reports
    if (/application\/json/i.test(ct)) return false;
    const head = (await res.text()).slice(0, 12000);
    if (/data-uxd-eval-report/i.test(head)) return true;
    if (/data-uxd-view=["']eval["']/i.test(head)) return true;
    if (/<title>\s*Evaluation:/i.test(head)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Same-origin eval paths under <base href> (e.g. /mr-218/) then site root. */
function evalUrlCandidates(fallback: string, id?: string): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };
  const base = getBaseHref(); // ends with / when non-root
  const fromConfig = fallback.replace(/^\//, '').replace(/\/?$/, '/');
  if (base && base !== '/') push(`${base}${fromConfig}`);
  push(`/${fromConfig}`);
  if (id) {
    const conventional = `evals/${encodeURIComponent(id)}/`;
    if (base && base !== '/') push(`${base}${conventional}`);
    push(`/${conventional}`);
  }
  return out;
}

function isLocalHostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(url);
}

function isRunningOnLocalHost(): boolean {
  try {
    return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  } catch {
    return false;
  }
}

async function resolveEvalUrl(cfg: UxdPrototypeConfig): Promise<string | null> {
  if (cfg.id && (await helperHealthy())) {
    const helperUrl = `${HELPER}/evals/${encodeURIComponent(cfg.id)}/`;
    if (await looksLikeEvalReport(helperUrl)) return helperUrl;
  }
  const fallback = cfg.views?.eval;
  if (!fallback) return null;
  // Hosted absolute URLs (Pages) — trust without probing (may be cross-origin)
  if (/^https?:\/\//i.test(fallback)) return fallback;
  // Relative paths: try Pages path_prefix first (/mr-218/evals/…), then site-root /evals/…
  for (const url of evalUrlCandidates(fallback, cfg.id)) {
    if (await looksLikeEvalReport(url)) return url;
  }
  return null;
}

function evalUnavailableHint(cfg?: UxdPrototypeConfig): string {
  if (isRunningOnLocalHost()) {
    return 'Eval report not available yet — for local viewing, run export-helper on :9417';
  }
  const id = cfg?.id || '…';
  const base = getBaseHref();
  const prefix = base && base !== '/' ? base : '/';
  return `Eval report not available on this deployment (expected ${prefix}evals/${id}/)`;
}

const RETURN_URL_KEY = 'uxd-prototype-return-url';

function rememberPrototypeReturnUrl(): void {
  try {
    if (detectActiveView() !== 'prototype') return;
    sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
  } catch {
    /* private mode / blocked storage */
  }
}

function resolvePrototypeUrl(cfg: UxdPrototypeConfig): string {
  const configured = cfg.views?.prototype;
  // Ignore stale localhost URLs baked in during create when viewing on Pages
  if (configured && !(isLocalHostUrl(configured) && !isRunningOnLocalHost())) {
    return configured;
  }
  try {
    const stored = sessionStorage.getItem(RETURN_URL_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  try {
    const ref = document.referrer;
    if (ref && !/\/evals\//.test(ref)) return ref;
  } catch {
    /* ignore */
  }
  const base = getBaseHref();
  return base && base !== '/' ? base : '/';
}

function getActiveScenarioId(): string {
  if (window.UxdScenario) return window.UxdScenario.get();
  try {
    return new URLSearchParams(window.location.search).get('scenario') || 'default';
  } catch {
    return 'default';
  }
}

/** Respect <base href> (GitLab/GitHub Pages path prefix like /mr-218/). */
function getBaseHref(): string {
  try {
    const href = document.querySelector('base')?.getAttribute('href') || '/';
    if (!href || href === '/') return '/';
    return href.endsWith('/') ? href : `${href}/`;
  } catch {
    return '/';
  }
}

/** Strip <base href> prefix so scenario routes match SPA paths on Pages (/mr-218/…). */
function stripBasePath(pathname: string): string {
  const base = normalizePath(getBaseHref());
  if (base && base !== '/' && pathname.startsWith(base)) {
    const stripped = pathname.slice(base.length);
    return stripped ? (stripped.startsWith('/') ? stripped : `/${stripped}`) : '/';
  }
  return pathname;
}

function routeMatches(scenarioRoute: string | undefined, pathname: string): boolean {
  if (!scenarioRoute) return false;
  return normalizePath(scenarioRoute) === normalizePath(stripBasePath(pathname));
}

function scenariosForPath(scenarios: UxdBarScenario[] | undefined, pathname: string): UxdBarScenario[] {
  return (scenarios || []).filter((s) => s && s.id && routeMatches(s.route, pathname));
}

/**
 * Track location.pathname across SPA navigations (React Router, etc.).
 * Listens for popstate/hashchange, wraps history.pushState / replaceState,
 * and polls href as a fallback when another script re-wraps history.
 */
function useLocationPathname(): string {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let lastHref = window.location.href;
    const sync = () => {
      lastHref = window.location.href;
      setPathname(window.location.pathname);
    };
    const syncIfChanged = () => {
      if (window.location.href === lastHref) return;
      sync();
    };

    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);

    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
      const ret = origPush.apply(this, args);
      sync();
      return ret;
    };
    history.replaceState = function (this: History, ...args: Parameters<History['replaceState']>) {
      const ret = origReplace.apply(this, args);
      sync();
      return ret;
    };

    const poll = window.setInterval(syncIfChanged, 250);

    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
      window.clearInterval(poll);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return pathname;
}

/** Candidate URLs for public assets, base-aware then root-absolute. */
function assetCandidates(...pathsFromRoot: string[]): string[] {
  const base = getBaseHref();
  const out: string[] = [];
  for (const raw of pathsFromRoot) {
    const clean = raw.replace(/^\//, '');
    if (base !== '/') out.push(`${base}${clean}`);
    out.push(`/${clean}`);
  }
  return out;
}

function loadScriptOnce(candidates: string[], dataAttr: string, async = true): void {
  if (document.querySelector(`script[${dataAttr}]`)) return;
  const tryLoad = (index: number) => {
    if (index >= candidates.length) return;
    const script = document.createElement('script');
    script.src = candidates[index];
    script.setAttribute(dataAttr, 'true');
    script.async = async;
    script.onerror = () => {
      script.remove();
      tryLoad(index + 1);
    };
    document.head.appendChild(script);
  };
  tryLoad(0);
}

function applyPrototypeBarOffset(barEl: HTMLElement | null): () => void {
  document.body.classList.add('uxd-prototype-bar-offset');
  const syncHeight = () => {
    const el = barEl || document.getElementById('uxd-prototype-bar');
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (h > 0) {
      document.documentElement.style.setProperty('--uxd-pb-height', `${Math.ceil(h)}px`);
    }
  };
  syncHeight();
  const ro =
    typeof ResizeObserver !== 'undefined' && barEl
      ? new ResizeObserver(() => syncHeight())
      : null;
  if (barEl && ro) ro.observe(barEl);
  window.addEventListener('resize', syncHeight);
  return () => {
    document.body.classList.remove('uxd-prototype-bar-offset');
    document.documentElement.style.removeProperty('--uxd-pb-height');
    ro?.disconnect();
    window.removeEventListener('resize', syncHeight);
  };
}

/**
 * Sticky Prototype Bar — Sources, Prototype|Eval, Scenario, Export.
 * Requires serialize-page.browser.js for export (script tag or bundler copy).
 * Requires uxd-scenario-runtime.js for scenario switching.
 * Reads window.__UXD_PROTOTYPE__ (see references/prototype-bar-config.md).
 */
export const PrototypeBar: React.FC = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [evalReady, setEvalReady] = useState(false);
  const [cfg, setCfg] = useState<UxdPrototypeConfig>(() => window.__UXD_PROTOTYPE__ || {});
  const [activeScenario, setActiveScenario] = useState(getActiveScenarioId);
  const barRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const active = useMemo(() => detectActiveView(), []);
  const pathname = useLocationPathname();

  const pageScenarios = useMemo(
    () => scenariosForPath(cfg.scenarios, pathname),
    [cfg.scenarios, pathname]
  );
  const scenarioMenuEnabled = pageScenarios.length > 1;

  // Close the scenario menu when navigating to a route with no switchable scenarios.
  useEffect(() => {
    if (!scenarioMenuEnabled) setScenarioOpen(false);
  }, [scenarioMenuEnabled, pathname]);

  useLayoutEffect(() => applyPrototypeBarOffset(barRef.current), []);

  useEffect(() => {
    const load = async () => {
      if (window.__UXD_PROTOTYPE__) {
        setCfg(window.__UXD_PROTOTYPE__);
        return;
      }
      const candidates = assetCandidates(
        'uxd-prototype-bar/prototype-bar.json',
        'prototype-bar.json'
      );
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = (await res.json()) as UxdPrototypeConfig;
          window.__UXD_PROTOTYPE__ = data;
          setCfg(data);
          return;
        } catch {
          /* try next */
        }
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (window.UxdScenario) return;
    loadScriptOnce(
      assetCandidates(
        'uxd-prototype-bar/uxd-scenario-runtime.js',
        'uxd-scenario-runtime.js'
      ),
      'data-uxd-scenario-runtime',
      false
    );
  }, []);

  useEffect(() => {
    setActiveScenario(getActiveScenarioId());
    if (!window.UxdScenario) return;
    return window.UxdScenario.subscribe((id) => setActiveScenario(id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await resolveEvalUrl(cfg);
      if (!cancelled) setEvalReady(Boolean(url) || active === 'eval');
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg, active]);

  useEffect(() => {
    if (!window.UxdPrototypeExport?.exportStaticHtml) {
      loadScriptOnce(
        assetCandidates(
          'uxd-prototype-bar/serialize-page.browser.js',
          'serialize-page.browser.js'
        ),
        'data-uxd-serialize-bundle',
        true
      );
    }
    if (!window.UxdPrototypeExport?.exportPfSpecFiles) {
      loadScriptOnce(
        assetCandidates(
          'uxd-prototype-bar/export-pf-spec.browser.js',
          'export-pf-spec.browser.js'
        ),
        'data-uxd-pf-spec-bundle',
        true
      );
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (exportRef.current && !exportRef.current.contains(t)) setExportOpen(false);
      if (sourcesRef.current && !sourcesRef.current.contains(t)) setSourcesOpen(false);
      if (scenarioRef.current && !scenarioRef.current.contains(t)) setScenarioOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const waitForExport = useCallback(async () => {
    const start = Date.now();
    while (!window.UxdPrototypeExport && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!window.UxdPrototypeExport) {
      throw new Error('Export runtime not loaded (serialize-page.browser.js)');
    }
  }, []);

  const runHtml = async () => {
    setBusy(true);
    setStatus('Exporting HTML…');
    setExportOpen(false);
    try {
      await waitForExport();
      const result = await window.UxdPrototypeExport!.exportStaticHtml();
      const method = result.delivery?.method || 'download';
      setStatus(method === 'helper' ? `Saved ${result.delivery?.path}` : 'Downloaded HTML');
      if (result.warnings?.length) {
        console.warn('[uxd-prototype-export]', result.warnings);
      }
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const runTree = async () => {
    setBusy(true);
    setStatus('Exporting component tree…');
    setExportOpen(false);
    try {
      await waitForExport();
      const result = await window.UxdPrototypeExport!.exportTree();
      const method = result.delivery?.[0]?.method || 'download';
      setStatus(
        method === 'helper'
          ? `Saved tree (${result.source})`
          : `Downloaded tree (${result.source || 'unknown'})`
      );
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const runPfSpec = async () => {
    setBusy(true);
    setStatus('Exporting PF implementation spec…');
    setExportOpen(false);
    try {
      await waitForExport();
      const start = Date.now();
      while (!window.UxdPrototypeExport?.exportPfSpecFiles && Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (!window.UxdPrototypeExport?.exportPfSpecFiles) {
        throw new Error('PF spec runtime not loaded (export-pf-spec.browser.js)');
      }
      const result = await window.UxdPrototypeExport.exportPfSpecFiles();
      const method = result.delivery?.[0]?.method || 'download';
      const scenario = result.scenarioId ? ` · ${result.scenarioId}` : '';
      setStatus(
        method === 'helper'
          ? `Saved PF spec${scenario}`
          : `Downloaded PF spec${scenario}`
      );
      if (result.warnings?.length) {
        console.warn('[uxd-prototype-export] pf-spec', result.warnings);
      }
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const goPrototype = () => {
    const url = resolvePrototypeUrl(cfg);
    if (active === 'prototype') {
      setStatus('Viewing prototype');
      return;
    }
    window.location.href = url;
  };

  const goEval = async () => {
    setBusy(true);
    setStatus('Opening eval…');
    try {
      const url = await resolveEvalUrl(cfg);
      if (!url) {
        setStatus(evalUnavailableHint(cfg));
        return;
      }
      if (active === 'eval') {
        setStatus('Viewing eval');
        return;
      }
      rememberPrototypeReturnUrl();
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  };

  const selectScenario = (id: string) => {
    setScenarioOpen(false);
    if (id === activeScenario) {
      setStatus(`Scenario: ${id}`);
      return;
    }
    setStatus(`Scenario: ${id}`);
    if (window.UxdScenario) {
      window.UxdScenario.set(id);
      return;
    }
    const url = new URL(window.location.href);
    if (id === 'default') url.searchParams.delete('scenario');
    else url.searchParams.set('scenario', id);
    window.location.assign(url.toString());
  };

  const sources = cfg.sources || [];
  const showSources = sources.length > 0;
  const activeScenarioLabel =
    pageScenarios.find((s) => s.id === activeScenario)?.name || activeScenario;

  return (
    <div id="uxd-prototype-bar" ref={barRef} role="region" aria-label="Prototype bar">
      <div className="uxd-pb-left">
        <span className="uxd-pb-brand">Prototype</span>
        {showSources && (
          <div className="uxd-pb-sources-wrap" ref={sourcesRef}>
            <button
              type="button"
              className="uxd-pb-btn"
              aria-haspopup="menu"
              aria-expanded={sourcesOpen}
              onClick={() => {
                setExportOpen(false);
                setScenarioOpen(false);
                setSourcesOpen((v) => !v);
              }}
            >
              Sources ▾
            </button>
            <ul className="uxd-pb-menu uxd-pb-sources-menu" role="menu" hidden={!sourcesOpen}>
              {(cfg.title || cfg.id) && (
                <li className="uxd-pb-sources-title" role="presentation">
                  {cfg.title || cfg.id}
                  {cfg.title && cfg.id ? ` · ${cfg.id}` : ''}
                </li>
              )}
              {sources.map((s, i) => {
                const label = s.key || s.label || 'Source';
                const kind = kindLabel(s.kind);
                if (s.url) {
                  return (
                    <li key={`${s.kind}-${s.key || s.url}-${i}`} role="none">
                      <a
                        className="uxd-pb-source-link"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                      >
                        <span className="uxd-pb-source-kind">{kind}</span>
                        <span className="uxd-pb-source-label">{label}</span>
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={`${s.kind}-${label}-${i}`} role="none">
                    <span className="uxd-pb-source-link uxd-pb-source-muted" role="menuitem">
                      <span className="uxd-pb-source-kind">{kind}</span>
                      <span className="uxd-pb-source-label">{label}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div className="uxd-pb-controls">
        <div className="uxd-pb-views" role="group" aria-label="View switch">
          <button
            type="button"
            aria-current={active === 'prototype' ? 'true' : undefined}
            onClick={goPrototype}
          >
            Prototype
          </button>
          <button
            type="button"
            aria-current={active === 'eval' ? 'true' : undefined}
            disabled={!evalReady && active !== 'eval'}
            title={!evalReady && active !== 'eval' ? evalUnavailableHint(cfg) : undefined}
            onClick={goEval}
          >
            Eval
          </button>
        </div>
        {active === 'prototype' && (
          <div className="uxd-pb-scenario-wrap" ref={scenarioRef}>
            <button
              type="button"
              className="uxd-pb-btn"
              aria-haspopup={scenarioMenuEnabled ? 'menu' : undefined}
              aria-expanded={scenarioMenuEnabled ? scenarioOpen : undefined}
              disabled={!scenarioMenuEnabled}
              title={scenarioMenuEnabled ? activeScenarioLabel : SCENARIO_UNAVAILABLE_HINT}
              onClick={() => {
                if (!scenarioMenuEnabled) return;
                setExportOpen(false);
                setSourcesOpen(false);
                setScenarioOpen((v) => !v);
              }}
            >
              Scenario ▾
            </button>
            {scenarioMenuEnabled && (
              <ul className="uxd-pb-menu uxd-pb-scenario-menu" role="menu" hidden={!scenarioOpen}>
                {pageScenarios.map((s) => (
                  <li key={`${s.route}-${s.id}`} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-current={s.id === activeScenario ? 'true' : undefined}
                      onClick={() => selectScenario(s.id)}
                    >
                      {s.name || s.id}
                      {s.id === activeScenario ? ' ✓' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {active !== 'eval' && (
          <div className="uxd-pb-export-wrap" ref={exportRef}>
            <button
              type="button"
              className="uxd-pb-btn"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              disabled={busy}
              onClick={() => {
                setSourcesOpen(false);
                setScenarioOpen(false);
                setExportOpen((v) => !v);
              }}
            >
              Export ▾
            </button>
            <ul className="uxd-pb-menu" role="menu" hidden={!exportOpen}>
              <li role="none">
                <button type="button" role="menuitem" onClick={runHtml}>
                  Static HTML
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" onClick={runTree}>
                  Component tree
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" onClick={runPfSpec}>
                  PF implementation spec
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      <span className="uxd-pb-status" aria-live="polite">
        {status}
      </span>
    </div>
  );
};

export default PrototypeBar;
