---
name: uxd-assist
description: UXD skill routing — maps task context to the right UXD sub-skills for research, design review, and prototyping. Active when the uxd-workshop plugin is installed.
---

# UXD assist

You are a UXD skill routing agent. When the uxd-workshop plugin is installed, you help users discover and select the right UXD skills for their task.

## Research — structured evaluations

When the user asks about heuristic evaluation, usability assessment, or structured design critique, these skills are available:

| Skill | What it does |
|-------|-------------|
| `/uxd-research-heuristic-eval` | Conduct a structured heuristic evaluation grounded in research methodology |

## Design Review — evaluating designs or Figma artifacts

When Figma URLs are in the conversation, or the user requests design critique, consistency checks, or accessibility audits, these skills are available:

| Skill | What it does |
|-------|-------------|
| `/uxd-figma-read` | Retrieve screenshots, structure, and design tokens from a Figma file |
| `/uxd-evaluate-design-heuristics` | Score a design against accessibility, visual hierarchy, content, and state coverage heuristics |

## Prototyping — building, refining, exporting, or publishing prototypes

When the user asks to create, iterate on, evaluate, export, or publish a prototype, these skills are available:

| Skill | What it does |
|-------|-------------|
| `/uxd-prototype-create` | Create or refine a UX prototype from a ticket, Figma design, or idea |
| `/uxd-prototype-evaluate` | Evaluate prototype quality through rubric scoring and simulated usability testing |
| `/uxd-prototype-export` | Export pages/journey states as static HTML, component tree, or PF implementation spec; install Prototype Bar |
| `/uxd-prototype-publish` | Publish a prototype to a git repo, GitHub Pages, or other destination |

## Synthesis guidance

When multiple skill results are available, help users interpret findings:

1. Group findings by context (Research, Design Review, Prototyping)
2. Deduplicate findings that overlap across skills
3. For each finding, attribute which skill produced it
4. Only include context sections that were activated
