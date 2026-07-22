import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

function routeMatches(scenarioRoute: string | undefined, pathname: string): boolean {
  if (!scenarioRoute) return false;
  return normalizePath(scenarioRoute) === normalizePath(pathname);
}

function scenariosForPath(scenarios: UxdBarScenario[] | undefined, pathname: string): UxdBarScenario[] {
  return (scenarios || []).filter((s) => s && s.id && routeMatches(s.route, pathname));
}

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

async function resolveEvalUrl(cfg: UxdPrototypeConfig): Promise<string | null> {
  if (cfg.id && (await helperHealthy())) {
    const helperUrl = `${HELPER}/evals/${encodeURIComponent(cfg.id)}/`;
    if (await looksLikeEvalReport(helperUrl)) return helperUrl;
  }
  const fallback = cfg.views?.eval;
  if (!fallback) return null;
  // Hosted absolute URLs (Pages) — trust without probing (may be cross-origin)
  if (/^https?:\/\//i.test(fallback)) return fallback;
  // Relative /evals/{id}/ only when it actually serves the report (not SPA fallback)
  if (await looksLikeEvalReport(fallback)) return fallback;
  return null;
}

const EVAL_UNAVAILABLE_HINT =
  'Eval report not available yet — for local viewing, run export-helper on :9417';

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
  if (cfg.views?.prototype) return cfg.views.prototype;
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
  return '/';
}

function getActiveScenarioId(): string {
  if (window.UxdScenario) return window.UxdScenario.get();
  try {
    return new URLSearchParams(window.location.search).get('scenario') || 'default';
  } catch {
    return 'default';
  }
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
  const exportRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const active = useMemo(() => detectActiveView(), []);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  const pageScenarios = useMemo(
    () => scenariosForPath(cfg.scenarios, pathname),
    [cfg.scenarios, pathname]
  );
  const showScenarioMenu = active === 'prototype' && pageScenarios.length > 1;

  useEffect(() => {
    const load = async () => {
      if (window.__UXD_PROTOTYPE__) {
        setCfg(window.__UXD_PROTOTYPE__);
        return;
      }
      const candidates = [
        '/uxd-prototype-bar/prototype-bar.json',
        '/prototype-bar.json',
      ];
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
    if (document.querySelector('script[data-uxd-scenario-runtime]')) return;
    const candidates = [
      '/uxd-prototype-bar/uxd-scenario-runtime.js',
      '/uxd-scenario-runtime.js',
    ];
    const script = document.createElement('script');
    script.src = candidates[0];
    script.setAttribute('data-uxd-scenario-runtime', 'true');
    script.async = false;
    script.onerror = () => {
      script.remove();
      const fallback = document.createElement('script');
      fallback.src = candidates[1];
      fallback.setAttribute('data-uxd-scenario-runtime', 'true');
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
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
    if (window.UxdPrototypeExport) return;
    if (document.querySelector('script[data-uxd-serialize-bundle]')) return;
    const candidates = [
      '/uxd-prototype-bar/serialize-page.browser.js',
      '/serialize-page.browser.js',
    ];
    const script = document.createElement('script');
    script.src = candidates[0];
    script.setAttribute('data-uxd-serialize-bundle', 'true');
    script.async = true;
    script.onerror = () => {
      script.remove();
      const fallback = document.createElement('script');
      fallback.src = candidates[1];
      fallback.setAttribute('data-uxd-serialize-bundle', 'true');
      fallback.async = true;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
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
        setStatus(EVAL_UNAVAILABLE_HINT);
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
    <div id="uxd-prototype-bar" role="region" aria-label="Prototype bar">
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
            title={!evalReady && active !== 'eval' ? EVAL_UNAVAILABLE_HINT : undefined}
            onClick={goEval}
          >
            Eval
          </button>
        </div>
        {showScenarioMenu && (
          <div className="uxd-pb-scenario-wrap" ref={scenarioRef}>
            <button
              type="button"
              className="uxd-pb-btn"
              aria-haspopup="menu"
              aria-expanded={scenarioOpen}
              title={activeScenarioLabel}
              onClick={() => {
                setExportOpen(false);
                setSourcesOpen(false);
                setScenarioOpen((v) => !v);
              }}
            >
              Scenario ▾
            </button>
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
