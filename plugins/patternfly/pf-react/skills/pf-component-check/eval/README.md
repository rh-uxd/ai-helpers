# pf-component-check eval

Evaluates PatternFly React **nesting and wrapper hierarchy** enforcement — the discriminating signal for this skill.

## With-skill / without-skill A/B delta

Baseline Claude (no skill) often treats invalid PF trees as fine React, or patches spacing with CSS. With `pf-component-check` loaded, the agent should cite required wrappers and hierarchy fixes.

| Case | Prompt style | Without skill (expected) | With skill (expected) |
|------|--------------|--------------------------|------------------------|
| `missing-page-section` | Explicit audit | May accept `<div>` under `<Page>` | Flags missing `PageSection` |
| `missing-card-body` | Explicit audit | May accept raw nodes in `<Card>` | Flags missing `CardBody` |
| `toolbar-spacing-bug` | Implicit (spacing symptom) | Suggests padding/flex CSS | Flags missing `ToolbarContent` / `ToolbarItem` |
| `drawer-panel-as-child` | Implicit (panel broken) | Misses `panelContent` prop rule | Moves `DrawerPanelContent` to `panelContent` |
| `nav-without-navlist` | Contextual hierarchy | Misses `NavList` requirement | Flags `NavItem` not under `NavList` |
| `valid-structure` | Negative control | N/A | Clean report — no false `[ERROR]` hierarchy findings |

## MCP

None — fixtures are self-contained React components. Eval denies `mcp__*`.

## Running

```bash
claude -p "/agent-eval-harness:eval-run --config plugins/patternfly/pf-react/skills/pf-component-check/eval/eval.yaml --no-llm-judges" \
  --allowedTools "Bash,Read,Write,Edit,Skill" \
  --permission-mode dontAsk
```
