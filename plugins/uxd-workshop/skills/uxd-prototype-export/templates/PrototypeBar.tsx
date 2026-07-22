import React, { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
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

/**
 * Sticky Prototype Bar — Export menu (static HTML / component tree).
 * Requires serialize-page.browser.js loaded (script tag or bundler copy).
 */
export const PrototypeBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
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
    setOpen(false);
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
    setOpen(false);
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

  return (
    <div id="uxd-prototype-bar" role="region" aria-label="Prototype bar">
      <span className="uxd-pb-brand">Prototype</span>
      <div className="uxd-pb-controls">
        <div className="uxd-pb-export-wrap" ref={menuRef}>
          <button
            type="button"
            className="uxd-pb-btn"
            aria-haspopup="menu"
            aria-expanded={open}
            disabled={busy}
            onClick={() => setOpen((v) => !v)}
          >
            Export ▾
          </button>
          <ul className="uxd-pb-menu" role="menu" hidden={!open}>
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
      </div>
      <span className="uxd-pb-status" aria-live="polite">
        {status}
      </span>
    </div>
  );
};

export default PrototypeBar;
