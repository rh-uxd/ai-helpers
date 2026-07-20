# eval-hint

Pre-journey intelligence gathering. Reads the workspace source files listed in `mr-delta.json` and extracts concrete information that helps eval-journey generate precise Playwright scripts. This skill is the "hinter" — it has full code access. The persona walker (eval-usability) discovers paths on its own.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/mr-delta.json` | Changed files list from eval-extract | Yes |
| `--workspace` | Path to prototype source code | Yes |
| `.artifacts/<KEY>/extract-state.json` | Journey definitions (to match routes to journeys) | Yes |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/navigation-hints.json` | Routes, selectors, page structure, nav hierarchy |

## What the hints are used for (and what they are NOT)

**Used for (by eval-usability in Phase B):**
- Diagnostic fallback URLs after click-first fails (to distinguish orphaned from missing)
- Nav section hierarchy (which parent button to expand for which child link)

**NOT used for:**
- Telling the persona where to click (defeats usability test)
- Auto-navigating to pages (hides discoverability issues)
- Scoring or verdicts (those come from what the walker actually experiences)
- Phase A eval-journey (x-ray mode reads source directly, does not consume hints)

**NOT produced (removed — unused downstream):**
- CSS selectors for specific elements (discovery personas should not have these)
- Page structure booleans (has_textarea, has_file_input, etc.)
- Feature flag lists (not consumed by any downstream skill)

## Procedure

### Step 1: Read MR delta and identify target files

Read `.artifacts/<KEY>/mr-delta.json`. Collect all files from `new_files` and `modified_files`.

Also identify related files not in the delta that provide navigation context:
- Route files: `AppRoutes.tsx`, `*Routes*`, `*routes*`
- Nav/sidebar config: `AppLayout.tsx`, `*Nav*`, `*Sidebar*`, `*navigation*`
- Feature flag files: `FeatureFlags*`, `*flags*`

```bash
cd <workspace>
# Find route definitions
grep -rl "Route\|path:" src/app/ --include="*.tsx" --include="*.ts" | head -10
# Find nav configuration
grep -rl "nav\|sidebar\|Nav\|Sidebar" src/app/ --include="*.tsx" --include="*.ts" | grep -i "layout\|nav\|sidebar" | head -10
```

### Step 2: Extract routes

Read route files and extract path definitions:

```bash
cd <workspace>
grep -n "path:" src/app/AppRoutes.tsx 2>/dev/null || grep -rn "path:" src/app/ --include="*Route*" | head -30
```

For each route, record:
- `path` — the URL path (e.g., `/gen-ai-studio/playground`)
- `file` — which file defines it
- `line` — line number
- `component` — the component rendered at that route (if discoverable)

### Step 3: Extract nav hierarchy

Read the sidebar/nav configuration to determine which sections contain which links:

```bash
cd <workspace>
# Read the nav layout file
cat src/app/AppLayout/AppLayout.tsx | grep -A 2 "NavItem\|nav__link\|expandable" | head -50
```

Build the nav section map: which parent button expands to reveal which child links. This directly tells eval-journey which section to expand for each target page.

### Step 4: Write navigation-hints.json

```json
{
  "extracted_at": "<ISO timestamp>",
  "workspace": "<workspace path>",
  "routes": [
    {
      "path": "/gen-ai-studio/playground",
      "file": "src/app/AppRoutes.tsx",
      "line": 142,
      "component": "PlaygroundPage"
    }
  ],
  "nav_sections": {
    "Gen AI studio": {
      "children": ["AI asset endpoints", "Playground", "Prompt management", "API keys"],
      "selector": "button:has-text(\"Gen AI studio\")"
    },
    "AI hub": {
      "children": ["Models", "MCP servers"],
      "selector": "button:has-text(\"AI hub\")"
    }
  }
}
```

## Rules

- Read ONLY files in the workspace. Do not fetch external URLs.
- If a file in mr-delta.json doesn't exist (deleted), skip it.
- The nav_sections map must reflect the ACTUAL sidebar hierarchy, not assumptions.
- Use `config/product-overlay.yaml > navigation` for file paths (sidebar_file, routes_file) instead of hardcoding paths.
- This skill runs ONCE per evaluation, deferred to just before Phase B. It runs after the Phase A fix loop, so hints reflect the final workspace state.
- Output only `routes` and `nav_sections`. Do NOT extract selectors, page_structure, or feature_flags — these are either unused downstream or would compromise discovery persona testing.
