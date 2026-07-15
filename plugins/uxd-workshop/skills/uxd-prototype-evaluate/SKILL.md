---
name: uxd-prototype-evaluate
description: >-
  Evaluate a prototype's quality through rubric scoring, simulated usability
  testing, and desirability studies. Three evaluation depths: quick (rubric
  only), standard (rubric + usability), or full (rubric + usability +
  desirability).
---

# Evaluate Prototype

Evaluate a prototype against its source RFE using a structured quality rubric, simulated usability testing with personas, and desirability analysis. Choose from three evaluation depths depending on context:

1. **Quick** — Rubric scoring only (3 dimensions, 0-2 each, max 6). Fast pass/fail gate.
2. **Standard** — Rubric + simulated usability testing with personas. Recommended for most workflows.
3. **Full** — Rubric + usability + desirability study. Runs every evaluation. Use for high-stakes or externally-facing prototypes.

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--depth` | `quick`, `standard`, `full` | `quick` | How thorough the evaluation should be |
| `--usability` | flag | off | Run usability testing (equivalent to `--depth standard` minimum) |
| `--desirability` | flag | off | Run desirability study (equivalent to `--depth full`) |

Individual flags override `--depth`. For example, `--depth quick --desirability` runs the rubric and desirability study but skips usability testing. `--usability --desirability` is equivalent to `--depth full`.

## Conversational Guidance

If the user asks to evaluate without specifying a depth or flags:

- "review", "score", "check" → default to **quick**
- "usability", "test", "walkthrough" → default to **standard**
- "desirability", "emotional", "aesthetic", "brand", "everything", "full evaluation" → default to **full**

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| Prototype HTML files | `.artifacts/{ID}/prototype/` or workspace modified files | Yes |
| RFE snapshot | `.artifacts/{ID}/rfe-snapshot.md` | Yes |
| `metadata.json` | `.artifacts/{ID}/metadata.json` | Yes |
| Research context | `.context/research-context/` (personas, journey maps) | No |
| Evaluation depth | `--depth` flag, `--usability`/`--desirability` flags, or conversational selection | Yes |

## Step 0: Detect Mode and Choose Depth

1. **Prototype ID** — from `$ARGUMENTS` or auto-detected from `.artifacts/`
2. **Evaluation depth** — resolve from flags: `--depth`, `--usability`, `--desirability`
3. **Mode detection:**
   - Workspace mode: `workspace-analysis.json` exists, files tracked via `changeset.md`
   - Standalone mode: prototype lives in `.artifacts/{ID}/prototype/`

---

# Rubric Review

Score each dimension using the rubric definitions in [references/ux-rubric.yaml](references/ux-rubric.yaml).

## Step 1: Load the Prototype and RFE

**Workspace mode:** Read `changeset.md` for modified files, `workspace-analysis.json` for context, all prototype files, and the RFE source.

**Standalone mode:** Read all HTML files in `.artifacts/{ID}/prototype/`, the RFE snapshot, and `metadata.json`.

## Step 2: Run Three Independent Review Dimensions

Each dimension scores 0-2. Evaluate independently.

### Dimension 1: Completeness

Does the prototype cover the user stories and acceptance criteria?

| Score | Criteria |
|-------|----------|
| 2 | All user stories represented. Acceptance criteria traceable. Core + alternate flows present. |
| 1 | Primary story represented but secondary missing. Happy path only. |
| 0 | Major stories missing. Core flow not represented. |

Instructions: List every user story, map each to a screen/flow, check acceptance criteria coverage.

### Dimension 2: Usability

Evaluated against Nielsen's 10 heuristics.

| Score | Criteria |
|-------|----------|
| 2 | No major heuristic violations. Patterns clear and consistent. States handled. |
| 1 | Minor violations. Core flows usable but with friction. Error states missing. |
| 0 | Major violations (3+). Dead-end flows. Navigation broken. |

**Nielsen's 10 Heuristics Checklist:**

1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, recover from errors
10. Help and documentation

Rate each: satisfied / partially satisfied / violated.

### Dimension 3: Feasibility

Can the prototype be built with PatternFly 6?

| Score | Criteria |
|-------|----------|
| 2 | All elements map to PF6 components. Standard layout patterns. |
| 1 | Most elements map but 1-2 need custom development. |
| 0 | Multiple elements have no PF6 equivalent. Would require custom design system. |

Instructions: List every UI component, map to PF6 equivalent, flag custom needs.

## Step 3: Write Individual Review Files

For each dimension, write `.artifacts/{ID}/reviews/{dimension}.md` with frontmatter:

```bash
python3 ${SKILL_DIR}/scripts/frontmatter.py set .artifacts/{ID}/reviews/{dimension}.md \
  prototype_id={ID} dimension={dimension} score={score} \
  verdict={verdict} reviewed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Each review file must follow this structure:

```markdown
# {Dimension} Review — {ID}

## Score: {score}/2 — {Pass|Partial|Fail}

## Findings

{Detailed findings organized by sub-criteria. Reference specific screens,
components, and flows. For usability, list each heuristic evaluated.
For completeness, trace each user story to its screen.}

## Evidence

{Specific references to prototype files, screens, or elements that support
the score. Quote filenames, line numbers, or UI element names so the
reviewer can verify.}

## Recommendations

{Actionable suggestions for improvement. Only include if score < 2.
Each recommendation should be specific enough to implement —
e.g., "Add an empty state to ApiKeyList when no keys exist"
not "Improve completeness."}
```

## Step 4: Score and Produce Summary

- Total = sum of 3 scores (max 6)
- **Pass**: total ≥ 5 AND no dimension scored 0
- **Needs attention**: total < 5 OR any dimension scored 0

Run the scoring script:

```bash
python3 ${SKILL_DIR}/scripts/score_prototype.py {ID}
```

Writes `.artifacts/{ID}/reviews/summary.md` with per-dimension scores, total, verdict, key findings, and recommendations.

## Step 5: Apply Labels (Optional)

If Jira integration available and running in pipeline mode: apply `rubric-pass` or `needs-attention` label.

## Step 6: Report Results

Print a console summary table showing all dimensions, scores, verdicts, and the total.

If depth is **quick** (and neither `--usability` nor `--desirability` flag is set), stop here.

---

# Usability Testing

Read [references/usability-testing.md](references/usability-testing.md) when the evaluation depth is **standard** or **full**, or when the `--usability` flag is set.

Simulated usability testing walks through the prototype as real users performing tasks, using persona-based perspectives to predict where users would succeed, struggle, or fail.

**Quick summary of the procedure:**
1. Load or construct personas (3 minimum: primary user, power user, infrequent user)
2. Extract user stories from the RFE
3. Define 4-8 task scenarios covering happy path, secondary flows, error recovery, discovery
4. Walk through each scenario step-by-step from each persona's perspective
5. Identify and severity-rank issues (S1 critical → S4 enhancement)
6. Apply Nielsen's 10 heuristics evaluation
7. Generate `.artifacts/{ID}/report-usability.md`

If depth is **standard** (and `--desirability` flag is not set), stop after usability. For **full**, continue to desirability.

---

# Desirability Study

Read [references/desirability-study.md](references/desirability-study.md) when the evaluation depth is **full**, or when the `--desirability` flag is set.

Evaluates aesthetic and emotional impact using methods adapted from the Microsoft Desirability Toolkit. Measures whether the prototype *feels* right, not just whether it works.

**Quick summary of the procedure:**
1. Analyze visual design, layout, microcopy tone, information density
2. Load personas or use default lenses (end user, evaluator, new user)
3. Word association: select 5 words per screen from positive/negative/neutral lists
4. Emotional response mapping across flow stages (confidence, control, satisfaction, trust, engagement)
5. Preference comparison against alternatives
6. Calculate desirability score (1-10) from four weighted factors
7. Generate `.artifacts/{ID}/report-desirability.md`

---

# Pipeline Report

After completing evaluation at any depth, generate the HTML pipeline report:

```bash
python3 ${SKILL_DIR}/scripts/generate-report.py --output .artifacts/pipeline-report.html
```

Aggregates all prototype reviews into a single dashboard.

---

# Edge Cases

| Scenario | Handling |
|----------|----------|
| Missing prototype files | Stop and report error. |
| Missing RFE snapshot | Proceed but mark Completeness as unevaluable. |
| Single-screen prototype | Reduce to 2-3 scenarios. Focus on within-screen interactions. |
| Minimal styling | Focus on flow and IA, not visual polish. |
| No user stories in RFE | Infer from problem description. Note inference. |
| Many screens (10+) | Group into flows, evaluate representative samples. |
| Happy path only | Flag in Completeness. Create edge-case scenarios anyway. |
| No research context | Use default personas. Live research should validate. |
| Purely functional (no styling) | Skip full evaluation. Focus usability on flow and IA. |

---

# Next Steps Guidance

| Outcome | Suggested Next Step |
|---------|-------------------|
| Quick: rubric-pass (5+, no zeros) | Suggest standard evaluation or proceed to submission |
| Quick: needs-attention | Identify lowest dimensions, suggest targeted refinement |
| Standard: no S1/S2 issues | Proceed to submission or full evaluation |
| Standard: S1 issues found | Critical fixes needed — list blockers, suggest refinement |
| Standard: S2 issues only | Recommend fixing before proceeding |
| Full: desirability 7+ | Ready for stakeholder review |
| Full: desirability 4-6 | Suggest visual/tonal refinements |
| Full: desirability 1-3 | Recommend design direction review |
