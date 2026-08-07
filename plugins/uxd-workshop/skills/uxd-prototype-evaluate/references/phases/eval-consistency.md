# eval-consistency

Runs PatternFly design consistency checks against the prototype using vendored guidelines from `.context/consistency-checker/` (bootstrapped via CONSISTENCY_CHECKER_REPO).

**Skip this entire skill if `.context/consistency-checker/` does not exist.** Write `{"skipped": true, "reason": "consistency-checker not bootstrapped"}` to `consistency-report.json` and exit.

## Execution Modes

eval-consistency runs in two modes, invoked separately by the orchestrator:

- **`--mode=source`** (Phase A setup): Runs deterministic source-code checks against MR delta files. Fast, no screenshots needed. Produces initial `consistency-report.json` and appends to `refinement-suggestions.json`. Called before eval-classify.
- **`--mode=visual`** (post-journey): Runs AI-powered visual checks against journey screenshots. Appends visual findings to the existing `consistency-report.json`. Called after eval-journey captures screenshots.
- **`--mode=both`** (legacy): Runs source then visual sequentially. Use when both inputs are available.

When called without `--mode`, defaults to `both` (legacy behavior).

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.context/consistency-checker/guidelines/` | Vendored PatternFly guideline markdown files | Yes |
| `.artifacts/<KEY>/eval/mr-delta.json` | Changed files list (scopes source-mode checks) | For source mode |
| `.artifacts/<KEY>/eval/journey-log.json` | Screenshots for visual-mode checks | For visual mode |
| `.artifacts/<KEY>/eval/screenshots/` | Journey screenshots | For visual mode |
| `--workspace` | Path to prototype source | For source mode |
| `--mode` | `source`, `visual`, or `both` | No (default: both) |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/eval/consistency-report.json` | Full consistency report (source + visual findings) |
| `.artifacts/<KEY>/eval/refinement-suggestions.json` | Appended with consistency suggestions |

## Procedure

### Step 1: Source Code Mode (when `--workspace` available)

**Mode gate:** Runs with `--mode=source` or `--mode=both`. Skip when `--mode=visual`.

**REQUIRED: Actually read the guideline files.** Do not produce placeholder results.

#### 1a: Detect applicable guideline categories and load only matching guidelines

Pre-filter guidelines based on what component types are actually used in the MR delta files. This avoids loading and checking guidelines for component categories not present in the prototype changes.

```bash
cd <workspace>
# Scan MR delta files for component type markers
DELTA_CONTENT=$(cat <new_files + modified_files from mr-delta.json> 2>/dev/null)

# Detect which categories are present
HAS_TABLES=$(echo "$DELTA_CONTENT" | grep -l '<Table\|<Tr\|<Td\|<Th\|<Thead\|<Tbody' | head -1)
HAS_BUTTONS=$(echo "$DELTA_CONTENT" | grep -l '<Button\|variant="primary"\|variant="secondary"' | head -1)
HAS_ICONS=$(echo "$DELTA_CONTENT" | grep -l 'Icon\b\|from.*icons' | head -1)
HAS_LABELS=$(echo "$DELTA_CONTENT" | grep -l '<Label\|<Badge' | head -1)
HAS_MENUS=$(echo "$DELTA_CONTENT" | grep -l '<Menu\|<Dropdown\|<Select' | head -1)
HAS_NAV=$(echo "$DELTA_CONTENT" | grep -l '<Nav\|<Sidebar\|NavItem\|nav__link' | head -1)
HAS_LAYOUTS=$(echo "$DELTA_CONTENT" | grep -l '<Page\|<PageSection\|<Stack\|<Split' | head -1)
```

**Only load guideline `.md` files from categories that matched.** For example, if `HAS_TABLES` and `HAS_BUTTONS` matched but nothing else, only read files from `guidelines/tables/` and `guidelines/buttons/`.

If NO categories match (rare — usually at least buttons or layouts), fall back to loading ALL guidelines.

The directory structure is organized by category:
- `tables/` — table-cell-content, table-column-headers, table-pagination, table-style-selection, table-toolbar-layout
- `icons/` — icon style patterns
- `labels/` — label usage patterns
- `layouts/` — page layout patterns
- `menus/` — menu patterns
- `navigation/` — nav patterns
- `buttons/` — button patterns

For each guideline file in the **matched categories**, extract:
- **Frontmatter:** `id`, `title`, `category`, `severity` (from YAML between `---` markers)
- **Rule:** The content under the `## Rule` heading (the actual check to perform)

#### 1b: Scope to MR delta files

Read `.artifacts/<KEY>/eval/mr-delta.json`. Collect `new_files` + `modified_files`. Only check these files — pre-existing violations in unchanged files are not this prototype's responsibility.

#### 1c: Run deterministic checks via analyze.py bash commands

The consistency-checker guidelines include `## Automated Checks` sections with literal bash commands (grep/find patterns) that can be extracted and executed. Use these for fast, deterministic, reproducible checking instead of LLM interpretation.

**Step 1c-i: Extract and run bash commands from guidelines**

For each guideline loaded in 1a, check if it has an `## Automated Checks` section with bash commands. If the guideline frontmatter has `automatable: true`, its bash commands are reliable.

```bash
# Option A: Use analyze.py directly (preferred if available)
# Run in check-only mode scoped to MR delta files. Capture violation data, skip report.
cd .context/consistency-checker/
python3 scripts/analyze.py --src=<workspace> --changed --json-output 2>/dev/null

# Option B: If analyze.py is not available or fails, extract bash commands manually:
# For each guideline .md file, parse the ## Automated Checks section,
# extract the grep/find commands, and run them against MR delta files only.
```

**Step 1c-ii: Parse violation output**

From the analyze.py output (or manual bash command results), extract each violation:
- `guideline_id` — from the guideline that defined the check
- `file`, `line` — from the grep/find output
- `description` — from the guideline's rule text
- `suggestion` — from the guideline's fix recommendation
- `severity` — from the guideline frontmatter

**Do NOT generate the analyze.py HTML/markdown report.** Only capture the structured violation data.

**Step 1c-iii: LLM-assisted judgment (edge cases only)**

For guidelines that have `automatable: false` or no `## Automated Checks` section, apply LLM-based analysis as a fallback. These are typically nuanced checks (e.g., "is the button order semantically correct in this context?") that grep cannot determine.

Record each violation with: `guideline_id`, `guideline_title`, `category`, `severity`, `file`, `line`, `description`, `suggestion`, `pf_doc_url`, `check_method` (`automated` or `llm_assisted`).

#### 1d: Compute summary

```
total_guidelines_checked = number of guidelines where the rule was applicable to at least one file
violations = count of severity:error findings
warnings = count of severity:warning findings
passes = total_guidelines_checked - violations - warnings
```

### Step 2: Visual Mode (when screenshots exist)

**Mode gate:** Runs with `--mode=visual` or `--mode=both`. Skip when `--mode=source`.

**When `--mode=visual`:** Read the existing `consistency-report.json` (from the prior source-mode pass) and append visual findings to it. Do not overwrite source-mode results.

Cross-reference captured screenshots against PatternFly guidelines for visual violations (icon style, layout patterns, empty states, CTA placement) that source-mode cannot detect.

**Structured extraction (preferred):** If `.context/consistency-checker/scripts/visual_analyze.py` exists, use it to extract DOM structure with bounding boxes from key pages. This gives the LLM structured visual input instead of raw PNGs:

```bash
cd .context/consistency-checker/
python3 scripts/visual_analyze.py --url=<prototype-url> --pages=<key-routes-from-journey-log>
```

The script captures screenshot + DOM with bounding boxes. Feed this structured data to the LLM for guideline analysis.

**Fallback:** If visual_analyze.py is not available, analyze the raw journey screenshots directly.

1. Collect unique screenshots from `journey-log.json` (both `journeys[].steps[].screenshot` and `exploration[].steps[].screenshot`). Also include Phase B persona screenshots if available (`screenshots/persona-*.png`).
2. For each screenshot, check against applicable visual guidelines (from matched categories in Step 1a).
3. Each finding records: `screenshot`, `journey`, `step`, `guideline_id`, `guideline_title`, `category`, `severity`, `verdict` (`VIOLATION`), `description`, `suggestion`.
4. **Deduplicate:** If the same violation appears on multiple screenshots, collapse to one finding with a `seen_on` array.

### Step 3: Write consistency-report.json

**Write behavior by mode:**
- `--mode=source`: Create a new `consistency-report.json` with `source_mode` populated and `visual_mode.ran = false`.
- `--mode=visual`: Read existing `consistency-report.json`, update `visual_mode` section, recompute `summary` to include both source + visual findings.
- `--mode=both`: Write complete file with both sections.

```json
{
  "source": "consistency-checker",
  "checked_at": "<ISO timestamp>",
  "guidelines_version": "<git short hash from .context/consistency-checker/>",
  "source_mode": {
    "ran": true,
    "violations": []
  },
  "visual_mode": {
    "ran": true,
    "screenshots_checked": 12,
    "findings": []
  },
  "summary": {
    "total_guidelines_checked": 8,
    "violations": 3,
    "warnings": 1,
    "passes": 4
  }
}
```

Set `"ran": false` for any mode that could not execute (no workspace = no source mode; no screenshots = no visual mode).

### Step 4: Append to refinement-suggestions.json

For each violation, add a consistency suggestion entry:

```json
{
  "type": "consistency",
  "guideline_id": "<id>",
  "severity": "<error|warning>",
  "file": "<path>",
  "line": "<number>",
  "current": "<what's there now>",
  "fix": "<what it should be>",
  "pf_doc_url": "<url>",
  "source": "<source_mode|visual_mode>"
}
```

Only include violations from MR delta files. Consistency fixes are applied FIRST by eval-fix (deterministic, high confidence).
