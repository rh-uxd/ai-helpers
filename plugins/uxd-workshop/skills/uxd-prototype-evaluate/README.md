# uxd-prototype-evaluate

Evaluates a prototype's quality through structured scoring, simulated usability testing, and desirability analysis. Choose the depth that fits your workflow — from a quick rubric pass/fail gate to running every evaluation.

## Evaluation Depths

| Depth | What it does | When to use |
|-------|-------------|-------------|
| **Quick** | 3-dimension rubric scoring (0-2 each, max 6). Pass threshold: 5+ with no zeros. | Fast quality gate after creation. Default in the pipeline. |
| **Standard** | Rubric + simulated usability testing with personas and task scenarios. | Recommended for most prototypes before sharing with stakeholders. |
| **Full** | Rubric + usability + desirability study (word association, emotional mapping, preference comparison). Runs every evaluation. | When the design direction matters and you want to validate the "feel." |

## Inputs

| Input type | Location | Required |
|------------|----------|----------|
| Prototype files | `.artifacts/{ID}/prototype/` (standalone) or target workspace (workspace mode) | Yes |
| RFE snapshot | `.artifacts/{ID}/rfe-snapshot.md` | Yes (for rubric scoring) |
| Metadata | `.artifacts/{ID}/metadata.json` | Yes |
| Changeset manifest | `.artifacts/{ID}/changeset.md` | Yes (workspace mode) |
| Research context | `.context/research-context/` (personas, JTBD) | Optional (for usability testing) |

## Outputs

| Output | Format | Location |
|--------|--------|----------|
| Dimension reviews | Markdown with frontmatter (one per dimension) | `.artifacts/{ID}/reviews/{dimension}.md` |
| Review summary | Markdown with aggregate scores and verdict | `.artifacts/{ID}/reviews/summary.md` |
| Usability report | Markdown with personas, task walkthroughs, severity-ranked issues | `.artifacts/{ID}/report-usability.md` |
| Desirability report | Markdown with word associations, emotional map, preference ranking, score | `.artifacts/{ID}/report-desirability.md` |
| Pipeline report | HTML dashboard summarizing all prototypes | `.artifacts/pipeline-report.html` |

## Rubric Dimensions

| Dimension | Question |
|-----------|----------|
| **Completeness** | Does the prototype cover the RFE's user stories and acceptance criteria? |
| **Usability** | Is the interaction pattern clear and free of obvious friction? |
| **Feasibility** | Can this be built with the target design system (PatternFly)? |

Each scored 0 (fail), 1 (partial), or 2 (pass). Total of 5+ with no zeros = pass.

## Quick Start

- "Review the prototype for PROJ-298"
- "Run a usability test on what we just built"
- "How does this prototype feel? Run a desirability study."
- "Score all unreviewed prototypes in .artifacts/"

## Related

- **uxd-prototype-create** — Create or refine prototypes (refinement uses evaluation feedback)
- **uxd-prototype-pipeline** (agent) — Automated create-review-refine loop
