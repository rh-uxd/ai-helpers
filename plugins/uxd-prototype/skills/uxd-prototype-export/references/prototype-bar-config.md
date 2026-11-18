# Prototype Bar config

Runtime config for Sources, Prototype ↔ Eval navigation, and State switching. Source of truth on disk:

`.artifacts/{ID}/prototype-bar.json`

Full state catalog lives in sibling `.artifacts/{ID}/states.json` (see `states-schema.md`). Sync flattens it into the slim `scenarios` array below.

At install/publish time this is copied or inlined so the running page can read:

`window.__UXD_PROTOTYPE__`

Active state on the page: `?state=<id>` (default when absent: `default`). Runtime: `window.UxdScenario` from `templates/uxd-scenario-runtime.js`.

## Schema

```json
{
  "id": "PROJ-298",
  "title": "API Key Management",
  "jiraBaseUrl": "https://issues.example.com/browse/",
  "sources": [
    {
      "kind": "outcome",
      "key": "OUT-12",
      "label": "Outcome",
      "url": "https://issues.example.com/browse/OUT-12"
    },
    {
      "kind": "rfe",
      "key": "PROJ-298",
      "label": "RFE",
      "url": "https://issues.example.com/browse/PROJ-298"
    },
    {
      "kind": "rfe",
      "key": "PROJ-301",
      "label": "RFE",
      "url": "https://issues.example.com/browse/PROJ-301"
    },
    {
      "kind": "figma",
      "label": "Figma",
      "url": "https://www.figma.com/design/…"
    },
    {
      "kind": "description",
      "label": "Feature description"
    }
  ],
  "views": {
    "prototype": null,
    "eval": "/prototype-evaluations/PROJ-298/"
  },
  "scenarios": [
    { "route": "/api-keys", "id": "default", "name": "Populated list", "default": true },
    { "route": "/api-keys", "id": "empty", "name": "Empty state" },
    { "route": "/api-keys", "id": "load-error", "name": "Load error" }
  ]
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Prototype / artifact key (usually primary Jira key) |
| `title` | string | Human title shown in Sources header when present |
| `jiraBaseUrl` | string | Base URL for building browse links (`…/browse/`) |
| `sources` | array | Provenance entries (outcome, RFE, strat, Figma, description, idea) |
| `sources[].kind` | string | `outcome` \| `rfe` \| `strat` \| `figma` \| `description` \| `idea` \| `other` |
| `sources[].key` | string | Optional Jira key |
| `sources[].label` | string | Display label |
| `sources[].url` | string | Optional link (Jira browse, Figma, etc.) |
| `views.prototype` | string \| null | URL for Prototype view; `null` = session return URL / referrer / `/` |
| `views.eval` | string \| null | Relative Pages path (`/prototype-evaluations/{ID}/`) or absolute hosted URL; empty until report exists |
| `scenarios` | array | Slim flatten of `states.json` for the State menu |
| `scenarios[].route` | string | Page path; menu filters by current pathname |
| `scenarios[].id` | string | State id (`?state=<id>`) |
| `scenarios[].name` | string | Display label |
| `scenarios[].default` | boolean | Optional; marks the default scenario |

## Behavior

| Condition | Bar behavior |
|-----------|--------------|
| No `sources` or empty | Sources control hidden |
| Helper `127.0.0.1:9417` healthy + report present | Eval navigates to `http://127.0.0.1:9417/evals/{id}/` (serves `.artifacts/{id}/eval/` or key-root fallback) |
| Absolute `views.eval` (http/https) | Eval navigates there when helper is down / missing report |
| Relative `views.eval` (e.g. `/prototype-evaluations/{id}/`) | Probes **`<base href>`-prefixed** path first (e.g. `/mr-218/prototype-evaluations/{id}/`), then site-root. Only enables Eval for a real report, not an SPA app shell |
| No reachable report | Eval disabled; local hint mentions `export-helper` on `:9417`; hosted hint shows `{base}prototype-evaluations/{id}/` |
| ≤1 scenario for current route | State menu hidden |
| State ▾ (prototype view) | Always shown; enabled when ≥2 scenarios match the current route (updates on SPA navigation). Disabled with tooltip when none. Selection sets `?state=` |

**Local SPA note:** A missing static report may return the SPA app shell, not report HTML. Pass the exact `artifacts/{ID}/prototype-evaluations/{run}/` to `copy-eval-for-pages.sh`; it copies HTML into `public/prototype-evaluations/{id}/` for the next build. The helper's existing `/evals/{id}/` endpoint remains for older `.artifacts/{id}/eval/` reports; it does not pick a new run automatically. Static links resolve against `<base href>` / `ASSET_PATH` for MR previews.

**Prototype URL note:** Do not leave `views.prototype` as `http://localhost:…` in published builds. Sync clears localhost URLs; the bar also ignores them when the current host is not localhost and falls back to the session return URL / `<base href>`.

**Eval page chrome:** The helper and `copy-eval-for-pages.sh` embed the standalone Prototype Bar into evaluation HTML. The evaluator's canonical renderer does not install it. Clicking Prototype returns via `views.prototype`, else the session return URL stashed when leaving the prototype, else `document.referrer`.

## Who writes it

| Skill / step | Action |
|--------------|--------|
| **uxd-prototype-create** (Step 9) | Write initial file from `source`, `source_rfes`, Figma URL, title; sync scenarios |
| **uxd-prototype-evaluate** | Merge outcome / strat keys from `outcome-context.json` into `sources` |
| **publish-report.sh** | Set `views.eval` to the configured Pages URL or `/prototype-evaluations/{KEY}/`; write `report-url.txt` |
| **install-prototype-bar.sh** | With `--artifacts`: sync config, inject into standalone HTML or copy next to workspace public assets, install `uxd-scenario-runtime.js`, copy eval report for Pages |

Use `scripts/sync-prototype-bar-config.mjs` to create or merge the file from metadata + optional outcome context + `states.json`.

## Static Pages layout

Keep new evaluation runs under `artifacts/{ID}/prototype-evaluations/{run}/`.
Creation metadata retains its existing owner/location. For static Pages:

```
public/
  prototype-evaluations/{ID}/index.html  ← HTML from the explicitly selected run
  uxd-prototype-bar/        ← serialize-page.browser.js + CSS + config (for Export)
  …                         ← prototype preview (e.g. mr-{iid}/)
```

Bar links use `/prototype-evaluations/{ID}/`, resolved under `<base href>` when present (for example `/mr-218/prototype-evaluations/{ID}/`). Existing explicit older URLs remain readable. No dynamic server is required when hosted.

**Export on Pages:** The Export menu does **not** download pre-generated journey captures. It runs the in-page serializer and triggers a browser download (same fallback as when `export-helper` is down). `inject-prototype-bar-into-html.mjs` inlines `serialize-page.browser.js` for prototype HTML; React installs load it via `<base href>`-aware URLs under `uxd-prototype-bar/`.

**Toast / fixed overlays:** Mounting the bar adds `body.uxd-prototype-bar-offset` and sets `--uxd-pb-height` so PatternFly toast groups clear the bar + typical app masthead.
