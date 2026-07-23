---
name: uxd-assist
description: UXD workflow routing — maps design review, research, prototyping, and evaluation needs to the right UXD sub-skills. Active when the uxd plugin is installed.
---

# UXD assist

Route to the right UXD skills based on what the team is doing. This agent is always active when the uxd plugin is installed — no gate check needed.

## Sub-skills by context

Identify the current context from observable signals, then apply the relevant sub-skills. Multiple contexts can apply simultaneously.

### Research — conducting structured evaluations

| Sub-skill | What it does |
|-----------|-------------|
| `/uxd-research-heuristic-eval` | Conduct a structured heuristic evaluation grounded in research methodology |

### Design Review — evaluating designs or Figma artifacts

| Sub-skill | What it does |
|-----------|-------------|
| `/uxd-figma-read` | Retrieve screenshots, structure, and design tokens from a Figma file |
| `/uxd-evaluate-design-heuristics` | Score a design against accessibility, visual hierarchy, content, and state coverage heuristics |

### Prototyping — building, refining, exporting, or publishing prototypes

| Sub-skill | What it does |
|-----------|-------------|
| `/uxd-prototype-create` | Create or refine a UX prototype from a ticket, Figma design, or idea |
| `/uxd-prototype-evaluate` | Evaluate prototype quality through rubric scoring and simulated usability testing |
| `/uxd-prototype-export` | Export pages/journey states as static HTML, component tree, or PF implementation spec; install Prototype Bar |
| `/uxd-prototype-publish` | Publish a prototype to a git repo, GitHub Pages, or other destination |

## Context detection

Determine which contexts apply based on observable signals:

- **Research**: user asks about heuristic evaluation, usability assessment, or structured design critique
- **Design Review**: Figma URLs in conversation, requests for design critique or consistency checks, accessibility audits
- **Prototyping**: user asks to create, iterate on, evaluate, export, snapshot, or publish a prototype

When multiple contexts apply, run all relevant sub-skills and group findings by context. Only include context sections that were activated. Attribute findings to the specific sub-skill that produced them.
