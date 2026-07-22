# Prototype Bar config

Runtime config for Sources, Prototype ↔ Eval navigation, and Scenario switching. Source of truth on disk:

`.artifacts/{ID}/prototype-bar.json`

Full scenario catalog lives in sibling `.artifacts/{ID}/scenarios.json` (see `scenarios-schema.md`). Sync flattens it into the slim `scenarios` array below.

At install/publish time this is copied or inlined so the running page can read:

`window.__UXD_PROTOTYPE__`

Active scenario on the page: `?scenario=<id>` (default when absent: `default`). Runtime: `window.UxdScenario` from `templates/uxd-scenario-runtime.js`.

## Schema

```json
{
  "id": "PROJ-298",
  "title": "API Key Management",
  "jiraBaseUrl": "https://issues.redhat.com/browse/",
  "sources": [
    {
      "kind": "outcome",
      "key": "OUT-12",
      "label": "Outcome",
      "url": "https://issues.redhat.com/browse/OUT-12"
    },
    {
      "kind": "rfe",
      "key": "PROJ-298",
      "label": "RFE",
      "url": "https://issues.redhat.com/browse/PROJ-298"
    },
    {
      "kind": "rfe",
      "key": "PROJ-301",
      "label": "RFE",
      "url": "https://issues.redhat.com/browse/PROJ-301"
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
    "eval": "/evals/PROJ-298/"
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
| `views.prototype` | string \| null | URL for Prototype view; `null` = current origin / `/` |
| `views.eval` | string \| null | Relative Pages path (`/evals/{ID}/`) or absolute hosted URL; empty until report exists |
| `scenarios` | array | Slim flatten of `scenarios.json` for the Scenario menu |
| `scenarios[].route` | string | Page path; menu filters by current pathname |
| `scenarios[].id` | string | Scenario id (`?scenario=<id>`) |
| `scenarios[].name` | string | Display label |
| `scenarios[].default` | boolean | Optional; marks the default scenario |

## Behavior

| Condition | Bar behavior |
|-----------|--------------|
| No `sources` or empty | Sources control hidden |
| `views.eval` set | Eval navigates there when helper is down |
| Helper `127.0.0.1:9417` healthy | Eval prefers `http://127.0.0.1:9417/evals/{id}/` |
| No eval URL and no helper | Eval disabled; status “Eval report not available yet” |
| ≤1 scenario for current route | Scenario menu hidden |
| ≥2 scenarios for current route | Scenario ▾ menu; selection sets `?scenario=` and reloads |

## Who writes it

| Skill / step | Action |
|--------------|--------|
| **uxd-prototype-create** (Step 9) | Write initial file from `source`, `source_rfes`, Figma URL, title; sync scenarios |
| **uxd-prototype-evaluate** | Merge outcome / strat keys from `outcome-context.json` into `sources` |
| **publish-report.sh** | Set `views.eval` to Pages URL or `/evals/{KEY}/`; write `report-url.txt` |
| **install-prototype-bar.sh** | Inject config into standalone HTML or copy next to workspace public assets; install `uxd-scenario-runtime.js` |

Use `scripts/sync-prototype-bar-config.mjs` to create or merge the file from metadata + optional outcome context + `scenarios.json`.

## Static Pages layout

Keep working artifacts under `.artifacts/{ID}/`. For GitLab/GitHub Pages (no backend):

```
public/
  evals/{ID}/index.html     ← copy of evaluation-report.html
  …                         ← prototype preview (e.g. mr-{iid}/)
```

Bar links use same-origin relative paths (`/evals/{ID}/`). No dynamic server required when hosted.
