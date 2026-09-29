---
name: pf-import-check
description: Audit PatternFly imports for correctness and bundle-size anti-patterns. Use when imports fail, bundles are bloated, or after upgrading PatternFly versions.
---

# PF Import Checker

Find and report invalid PatternFly import patterns and bundle-size anti-patterns.

## PatternFly API documentation

If PatternFly documentation tools are available, use them to confirm current package paths and import subpaths before flagging. Without documentation available, rely on the import rules and examples in this skill.

## Input

The user provides a file path, directory, or component to check. Default to scanning the project source directory. Adapt search paths to the project structure (`src/`, `app/`, `packages/*/src/`).

## What to check

### Import correctness

1. Charts imported from `@patternfly/react-charts` root (must use `/victory` subpath).
2. Chatbot imports not using `@patternfly/chatbot/dist/dynamic/*`.
3. Component-group imports not using `@patternfly/react-component-groups/dist/dynamic/*`.
4. Missing package CSS imports for features in use.

### Bundle-size anti-patterns

5. **Barrel imports from `@patternfly/react-icons`** — importing from the package root pulls in the entire icon set (~1.8MB per SSR chunk). Each icon must be imported individually from its deep path.
6. **Full CSS bundle import** — importing `@patternfly/patternfly/patternfly.css` or `@patternfly/patternfly/patternfly-base.css` pulls the entire stylesheet. Import only the CSS modules needed: `base.css` + feature-specific CSS (`patternfly-charts.css`, `patternfly-addons.css`).
7. **Duplicate PF module imports** — the same component imported from different paths (e.g., both `@patternfly/react-core` and `@patternfly/react-core/dist/esm/...`) inflates the bundle with duplicate modules.

## Validation commands

```bash
# Import correctness
rg "@patternfly/react-charts['\"]" <source-dir>
rg "@patternfly/chatbot['\"]" <source-dir>
rg "@patternfly/react-component-groups['\"]" <source-dir>

# Bundle-size anti-patterns
rg "from ['\"]@patternfly/react-icons['\"]" <source-dir>
rg "patternfly\.css|patternfly-base\.css" <source-dir>
rg "@patternfly/react-core/dist/" <source-dir>
```

## Correct import examples

```tsx
// Charts — use /victory subpath
import { ChartDonut } from "@patternfly/react-charts/victory";

// Chatbot — use /dist/dynamic/ subpath
import { Chatbot } from "@patternfly/chatbot/dist/dynamic/Chatbot";

// Component groups — use /dist/dynamic/ subpath
import { BulkSelect } from "@patternfly/react-component-groups/dist/dynamic/BulkSelect";
```

### Icon imports

```tsx
// Bad — barrel import pulls entire icon set (~1.8MB)
import { CogIcon, BellIcon } from "@patternfly/react-icons";

// Good — deep imports, tree-shakeable
import CogIcon from "@patternfly/react-icons/dist/dynamic/icons/cog-icon";
import BellIcon from "@patternfly/react-icons/dist/dynamic/icons/bell-icon";
```

### CSS imports

```tsx
// Bad — pulls entire PF stylesheet
import "@patternfly/patternfly/patternfly.css";

// Good — base + only what you need
import "@patternfly/react-core/dist/styles/base.css";
import "@patternfly/patternfly/patternfly-charts.css";      // only if using charts
import "@patternfly/chatbot/dist/css/main.css";              // only if using chatbot
import "@patternfly/react-component-groups/dist/css/main.css"; // only if using component groups
```

## Rules

- Report barrel icon imports as high severity — they are the single largest contributor to PF bundle bloat
- Report full CSS imports as medium severity — wasteful but less impactful than icon barrels
- Report duplicate module imports as low severity — often accidental, usually fixable by updating one import path
- When a file has both correctness and bundle issues, report correctness first
- Do not flag `@patternfly/react-core` barrel imports — this package is designed for tree-shaking and barrel imports are the correct pattern
- Do not flag `@patternfly/react-table` barrel imports — same as react-core, tree-shakeable by design

## Output format

For each finding, provide:

- **Severity**: high | medium | low
- **File path** and line number
- **Current import** — the offending line
- **Suggested fix** — the corrected import
- **Impact** — estimated bundle size reduction or explanation of why this matters

Group findings by severity (high first). End with a summary count: `Found N import issues: X high, Y medium, Z low.`
