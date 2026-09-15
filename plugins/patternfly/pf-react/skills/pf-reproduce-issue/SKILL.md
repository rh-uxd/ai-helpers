---
name: pf-reproduce-issue
description: Reproduce a PatternFly bug from a GitHub issue description. Use when triaging PF bug reports, verifying fixes, or confirming whether an issue is still present.
disable-model-invocation: true
---

# PF Issue Reproducer

Attempt automated reproduction of a PatternFly bug report. Parse the issue, extract reproduction steps, run them against a local environment, and produce a structured verdict.

## PatternFly API documentation

If PatternFly documentation tools are available, use them to verify component APIs and confirm whether reported behavior matches current documentation before attempting reproduction.

## Input

The user provides one of:
- A GitHub issue URL (e.g., `https://github.com/patternfly/patternfly-react/issues/1234`)
- A pasted issue description with reproduction steps
- A brief bug description to investigate (e.g., "Select dropdown closes on scroll in PF6")

## Reproduction Protocol

### 1. Parse the issue

Extract from the issue description:
- **Components involved** — which PF components are referenced
- **PF version** — major version (PF5/PF6) and specific package versions if listed
- **Reproduction steps** — numbered steps or prose describing how to trigger the bug
- **Expected vs actual behavior** — what should happen vs what does happen
- **Environment details** — browser, React version, SSR/CSR, bundler if mentioned

If the issue includes a CodeSandbox, StackBlitz, or repository link, note it but reproduce locally — external links may be outdated.

### 2. Set up reproduction environment

Choose the simplest approach that matches the issue context:

**If the user has an existing PF project open:**
- Use the current project. Check that PF versions match the issue.

**If no project is available:**
- Create a minimal reproduction using the project structure from `pf-project-gen`.
- Install only the PF packages referenced in the issue.

Ensure CSS imports are correct — many PF issues stem from missing or misordered CSS. For import rules, defer to the `pf-coding-standards` agent.

### 3. Write the reproduction case

Create a minimal component that follows the issue's repro steps:
- Use only the components mentioned in the issue
- Match the exact prop combinations described
- Include any state management or event handlers the issue describes
- Keep the component as small as possible — isolate the bug, don't build a full page

### 4. Run and observe

Run the reproduction and capture:
- **Console errors/warnings** — React warnings, PF deprecation notices, runtime errors
- **Visual behavior** — describe what renders and whether it matches the expected behavior
- **Component state** — any unexpected state transitions or prop values

### 5. Determine verdict

| Verdict | Criteria |
|---------|----------|
| **Reproduced** | The bug manifests as described in the issue |
| **Not reproduced** | The described behavior does not occur with the specified setup |
| **Partial** | Some aspects reproduce but not exactly as described |
| **Cannot reproduce** | Missing information prevents setting up the environment |

## Rules

- Never modify the user's existing project files without asking — create reproduction files in a separate directory (e.g., `repro/` or a temp directory)
- When the issue references specific PF versions, match them exactly — version mismatches invalidate the reproduction
- If reproduction requires browser interaction that cannot be automated (hover states, drag-and-drop), report what can be verified programmatically and note what requires manual testing
- Do not close, comment on, or modify GitHub issues — report findings to the user only
- When reproduction reveals an import issue, reference `pf-import-check` for the fix
- When reproduction reveals a structural issue, reference `pf-component-check` for the audit
- If the issue is version-specific and the user is on a different version, note the version mismatch in the report rather than silently upgrading

## Output

Produce a reproduction report:

```
## Reproduction Report: [Issue title or brief description]

**Source:** [GitHub issue URL or "user-reported"]
**Verdict:** Reproduced | Not reproduced | Partial | Cannot reproduce

### Environment
- PatternFly: [version]
- React: [version]
- Browser: [if relevant]

### Components
[List of PF components involved]

### Steps Taken
1. [What was done to reproduce]
2. ...

### Result
**Expected:** [from the issue]
**Actual:** [what happened]

### Evidence
[Console output, error messages, or behavioral description]

### Recommendations
[Suggested next steps — fix approach, workaround, or additional investigation needed]
```
