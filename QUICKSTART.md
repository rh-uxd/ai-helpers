# Quickstart: Contributing a Skill (for Designers & Researchers)

This guide is for contributors who aren't developers but want to create AI skills for their team. You'll write a single markdown file that teaches an AI tool how to do a task — no code required.

**Prerequisites:** Basic git knowledge (fork, clone, branch, PR). No CLI or developer tooling experience needed.

## What is a skill?

A skill is a markdown file (`SKILL.md`) that gives an AI assistant instructions for a specific task. When someone invokes your skill, the AI follows your instructions to produce a result.

Think of it like writing a detailed brief for a very capable intern — you describe the task, the expected output, and any constraints.

## The structure of a SKILL.md

Every skill has two parts: **frontmatter** (metadata) and **instructions** (what the AI should do).

```markdown
---
name: uxd-my-skill
description: Evaluate a design against UXD heuristics. Use when reviewing mockups, prototypes, or Figma frames for usability issues.
---

## Steps

1. Look at the design provided by the user
2. Evaluate it against these heuristics:
   - Is the navigation clear?
   - Are interactive elements visually distinct?
   - Is the information hierarchy logical?
3. Report findings as a numbered list with severity (high/medium/low)

## Output format

Return a markdown table with columns: Issue, Severity, Recommendation
```

### Frontmatter rules

The frontmatter block (between the `---` lines) has two required fields:

| Field | What it does | Rule |
|-------|-------------|------|
| `name` | How users invoke the skill (`/plugin:name`) | Must match the directory name. Use the `uxd-` prefix for UXD skills, `pf-` for PatternFly skills. |
| `description` | How the AI decides whether to load your skill | Follow the formula below — this is the most important line in your file. |

### Writing a good description

**Formula:** `[Action verb] [what it does]. [Use when + trigger contexts.]`

Start with an action verb (Evaluate, Generate, Summarize, Create, Audit). Then say what it does in one sentence. Then say when to use it.

**Good:**
```yaml
description: Evaluate a design against UXD heuristics. Use when reviewing mockups, prototypes, or Figma frames for usability issues.
```

**Good:**
```yaml
description: Summarize user research findings into a structured report. Use when synthesizing interview notes, survey results, or usability test observations.
```

**Bad — no action verb, no trigger context:**
```yaml
description: A guide for design evaluation.
```

## Creating your skill

Open your AI tool (Claude Code, Cursor, etc.) in any project directory and describe what you want:

```
Create a skill called "uxd-research-synthesis" that takes user research
notes (interview transcripts, survey results, observation logs) and produces
a structured research report with: key findings, themes, participant quotes,
and recommended next steps. Format the output as a markdown document.
```

The AI will generate a `SKILL.md` for you. Read it, test it, and iterate until the output matches what you'd actually want to see.

### Testing your skill

Invoke the skill by name in your AI tool and point it at real data. If the output isn't right, tell the AI what to change:

```
The themes section is too vague. Include specific participant quotes that support each theme.
```

Keep iterating until the result is something you'd actually use.

## Contributing your skill

Once you're happy with it:

1. Fork and clone this repo
2. Copy your `SKILL.md` into the right directory:
   - **UXD skills** → `plugins/uxd-workshop/skills/uxd-your-skill-name/SKILL.md`
   - **PatternFly skills** → `plugins/patternfly/pf-workshop/skills/pf-your-skill-name/SKILL.md`
3. Make sure the directory name matches the `name` in your frontmatter
4. Open a pull request against `main`

Your skill lands in a **workshop plugin** first. After 2+ weeks of real usage and a passing eval, it can graduate to a consumer plugin. See the [skill lifecycle](CONTRIBUTING.md#skill-lifecycle) diagram for the full journey.

## Examples for design & research workflows

These are simplified teaching examples — real skills in the repo may be more comprehensive.

### Design checklist skill

```markdown
---
name: uxd-design-checklist
description: Check a UI design against common usability criteria. Use when reviewing mockups, prototypes, or screenshots for usability issues before handoff.
---

## Steps

1. Ask the user to provide a design (screenshot, Figma URL, or description)
2. Evaluate the design against these criteria:
   - Is the navigation clear and consistent?
   - Are interactive elements visually distinct from static content?
   - Is the information hierarchy logical?
   - Are error states and empty states handled?
3. For each issue found, note:
   - Where in the design it occurs
   - Severity: critical, major, or minor
   - A specific recommendation to fix it
4. Skip criteria with no issues — don't pad the report

## Output format

Start with a one-sentence summary of overall usability.
Then list findings grouped by severity (critical first).
End with 2-3 prioritized next steps.
```

### Interview notes skill

```markdown
---
name: uxd-interview-notes
description: Synthesize user interview notes into a structured findings report. Use when consolidating interview transcripts or usability test observations into actionable insights.
---

## Steps

1. Ask the user for their interview notes (paste or file path)
2. Identify recurring themes across participants
3. For each theme:
   - Write a one-sentence finding
   - Include 1-2 direct participant quotes as evidence
   - Note how many participants mentioned it
4. Flag any contradictions between participants
5. Suggest 3-5 actionable next steps based on the findings

## Output format

Use this structure:
- **Summary** (2-3 sentences)
- **Key findings** (numbered, with supporting quotes)
- **Contradictions** (if any)
- **Recommended next steps** (prioritized)
```

## Tips

- **Keep it short.** Skills under 200 lines work best. If you're over 500, split it into two skills.
- **Be specific about output format.** The AI will produce better results when you describe exactly what the output should look like.
- **Test on real data.** A skill that works on toy examples but fails on real research notes isn't ready.
- **Iterate with the AI.** Your first draft won't be perfect. Tell the AI what's wrong and let it fix the instructions.

## Need help?

- Full contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Detailed skill-writing guide: [CONTRIBUTING-SKILLS.md](CONTRIBUTING-SKILLS.md)
- Common questions: [FAQ.md](FAQ.md)
