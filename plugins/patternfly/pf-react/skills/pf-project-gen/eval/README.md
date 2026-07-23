# pf-project-gen eval

Evaluates PatternFly React **project scaffolding** — PF6-safe dependencies, starter CSS imports, and PF layout structure. (Upstream ticket name: `pf-project-scaffolder`.)

## With-skill / without-skill A/B delta

Baseline Claude (no skill) often scaffolds a generic CRA/Vite React app, pins `@patternfly/*` to v5, or skips PatternFly starter imports/layout. With `pf-project-gen` loaded, the agent should prefer the official seed (or current PF6 packages), import `base.css`, and start from PF layout components.

| Case | Prompt style | Without skill (expected) | With skill (expected) |
|------|--------------|--------------------------|------------------------|
| `explicit-scaffold` | Explicit `pf-project-gen` | Generic React scaffold; may omit PF6 | Seed or `@patternfly/*` v6 + `base.css` + PF layout |
| `explicit-with-charts` | Explicit + charts | May omit charts package/CSS | Adds `@patternfly/react-charts` (+ charts CSS) |
| `implicit-admin-dashboard` | Implicit PF admin app | Generic admin UI / other design systems | PF6 deps + `PageSection`/`Stack`/`Grid` |
| `implicit-migration-sandbox` | Implicit PF5→PF6 sandbox | Vague upgrade notes; PF5 leftovers | PF6-safe sandbox via seed or current packages |
| `contextual-prototype` | Contextual prototype starter | Generic Vite React starter | `patternfly-react-seed` or PF6 starter layout |
| `negative-vue-app` | Negative control (Vue) | N/A | Vue/Vuetify path — **no** PF React scaffold |

## MCP

None — scaffolding prompts are self-contained. Eval denies `mcp__*`.

## Running

```bash
claude -p "/agent-eval-harness:eval-run --config plugins/patternfly/pf-react/skills/pf-project-gen/eval/eval.yaml --no-llm-judges" \
  --allowedTools "Bash,Read,Write,Edit,Skill" \
  --permission-mode dontAsk
```

Requires `pf-react@uxd-ai-helpers` installed (`claude plugin install pf-react@uxd-ai-helpers`) so `/pf-react:pf-project-gen` resolves.

## Latest run

`2026-07-20-claude-sonnet-4-6-v2` — all judges at **100%** pass rate ($2.99, 768s, 6/6 cases OK).
