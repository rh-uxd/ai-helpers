# Framework for Evaluating AI-Assisted Heuristic Evaluation Skills

## Why this is hard

Traditional heuristic evaluation already has a measurement problem.
[Hertzum & Jacobsen (2001)](https://dl.acm.org/doi/10.1145/1979742.1979788)
documented the **evaluator effect**: different human experts find different
problems and assign different severities. Inter-rater reliability is
consistently weak — one study found
[Krippendorff's Alpha of 0.343](https://dl.acm.org/doi/10.1145/1979742.1979788).
Severity ratings from single evaluators are
["very unreliable"](https://dl.acm.org/doi/10.1145/2851581.2892454).

This means evaluating an AI-assisted HE skill faces a moving baseline.
You can't just compare against "ground truth" because human experts don't
agree on ground truth either. The framework below accounts for this.

## Current state of the field

Several recent efforts inform what to measure:

| System | Approach | Key finding |
|--------|----------|-------------|
| [AIHeurEval](https://link.springer.com/chapter/10.1007/978-3-031-94168-9_22) (HCII 2025) | GPT-4o mini, multi-screen consistency | One-shot CoT prompting significantly improves performance |
| [Hybrid HE of IBM DOORS](https://doi.org/10.3390/app16020723) (2026) | ChatGPT-5 vs expert evaluators | 55% of LLM findings valid (32% overlap + 23% novel), 45% unconfirmed |
| [Will AI replace inspectors?](https://arxiv.org/html/2510.17056v1) (2025) | GPT-4o + Gemini vs 4 specialists | Human precision .917 vs lower for AI; combined coverage was best |
| [Humans vs AI](https://link.springer.com/chapter/10.1007/978-3-032-30044-7_9) (HCII 2026) | MLLMs vs human experts + participants | LLMs provide structured feedback with surprising consistency in early-stage design |
| [UXAgent](https://arxiv.org/abs/2502.12561) (CHI EA 2025) | LLM agents as simulated users | Generates thousands of synthetic test sessions against live websites |
| [UXCascade](https://arxiv.org/html/2601.15777) (2026) | Multi-level aggregation of agent feedback | Addresses the unstructured-output problem at scale |
| [PerceptUI](https://arxiv.org/html/2606.05697v1) (2026) | LLM agents as synthetic users | Position bias and behavior-alignment remain weak points |
| [Can MLLMs model expert ratings?](https://link.springer.com/chapter/10.1007/978-3-032-30549-7_12) (2026) | 4 MLLMs vs UICrit dataset (1000 screens) | Visual dimensions achieved near-perfect agreement (kappa >= 0.81) |

The consistent finding: **AI is a strong complement to human evaluators,
not a replacement.** False positives are the dominant failure mode, not
missed issues.

---

## Six evaluation dimensions

### 1. Detection quality

*Does the skill find real usability problems?*

This is the dimension with the most existing research. You need a human
expert baseline — but given the evaluator effect, you need **multiple**
human experts.

**Method:** Have 3-5 UX practitioners independently evaluate the same
interface using the same framework. Their union set is "known problems."
Then run the skill. Score:

| Metric | How to calculate | Target | Why |
|--------|-----------------|--------|-----|
| **Precision** | True positives / all skill findings | >= 0.70 | IBM DOORS study found 55% valid; multi-pass reconciliation should beat single-pass |
| **Recall** | True positives / known problems (union set) | >= 0.50 | Human evaluators individually hit ~.57 recall; matching that is strong |
| **F1** | Harmonic mean of precision and recall | >= 0.55 | Balances false positives against missed problems |
| **Novel valid findings** | Skill findings confirmed valid but not in expert union set | Track, don't threshold | This is the complement value — IBM DOORS found 23% novel valid |

**Matching criteria:** A skill finding counts as a true positive if it
identifies the same screen/element and the same type of usability concern
as a known problem. Exact heuristic mapping match is not required (experts
disagree on that too).

### 2. Violation quality

*Are the findings well-described and traceable?*

This is where AI-assisted HE often outperforms hastily-written human
notes — but also where hallucinations hide.

**Method:** Expert review of a sample (minimum 20 findings) on a rubric:

| Criterion | Score 0 | Score 1 | Score 2 |
|-----------|---------|---------|---------|
| **Specificity** | Vague ("navigation is confusing") | Names a screen or area | Names a specific element, label, or interaction |
| **Heuristic mapping** | Wrong heuristic or none cited | Plausible heuristic | Correct heuristic with principle name and number |
| **Evidence grounding** | No reference to observable UI | References UI broadly | Points to specific screenshot, element, or state |
| **Observation vs. interpretation** | Makes impact claims or user behavior predictions | Minor speculation | Purely observational — states the mismatch, not the consequence |
| **Traceability** | Can't locate the issue in the interface | Locatable with effort | Immediately locatable from the description alone |

**Target:** Mean score >= 1.5/2.0 across criteria. Any finding scoring 0
on evidence grounding is a **false positive candidate** and should be
verified.

### 3. Severity calibration

*Are the suggested severities reasonable?*

Severity is notoriously unreliable even among human experts. The goal
isn't perfect agreement — it's that the skill's distribution is not
systematically skewed.

**Method:** Have 3+ experts rate the same findings on the same scale
(Critical / Major / Minor / Cosmetic). Compare:

| Metric | How to calculate | Target |
|--------|-----------------|--------|
| **Weighted Cohen's kappa** (skill vs expert consensus) | Quadratic-weighted kappa on ordinal scale | >= 0.40 (moderate) |
| **Systematic bias** | Mean signed difference (skill - expert) | Within +/- 0.5 levels |
| **Critical accuracy** | % of skill's "Critical" ratings confirmed as Critical or Major | >= 0.80 |

A weighted kappa of 0.40 may seem low, but human-human severity agreement
often falls below that. The systematic bias metric catches the more
actionable problem: does the skill consistently over-rate or under-rate?

### 4. Evaluator independence

*Do the three passes (A/B/C) actually contribute different findings?*

The skill simulates three evaluator perspectives. If they're finding the
same things, the multi-pass architecture adds cost without value.

**Method:** Analyze the pre-reconciliation output across 5+ evaluations:

| Metric | How to calculate | Target |
|--------|-----------------|--------|
| **Unique contribution rate** | Findings from only one evaluator / total findings | >= 0.30 |
| **Pairwise overlap** | Jaccard similarity between any two evaluators | 0.15 - 0.50 |
| **Coverage lift** | Union(A,B,C) findings / Evaluator A findings alone | >= 1.4 |

If pairwise overlap exceeds 0.50, the evaluators aren't differentiated
enough. If unique contribution drops below 0.20, consider whether three
passes are worth the cost. AIHeurEval found that multi-screen analysis
improved consistency detection specifically because it forced
cross-referencing.

### 5. Run-to-run consistency

*Does the skill produce similar results on the same input?*

LLMs are non-deterministic. The question is whether the variance is noise
or signal.

**Method:** Run the skill 5 times on the same interface with the same
framework. Measure:

| Metric | How to calculate | Target |
|--------|-----------------|--------|
| **Finding stability** | % of findings appearing in >= 3/5 runs | >= 0.60 |
| **Severity stability** | % of stable findings with same severity across runs | >= 0.70 |
| **Total count variance** | Coefficient of variation of finding count | <= 0.30 |

Unstable findings aren't necessarily wrong — they may be borderline cases
that human evaluators also disagree on. But a skill where fewer than 60%
of findings are stable is producing noise, not signal.

### 6. Process compliance

*Does the skill follow its own rules?*

This is unique to skill evaluation (not covered in the academic
literature) and is what the existing eval harness already tests. It
matters because process violations erode trust.

| Check | Method | Pass/Fail |
|-------|--------|-----------|
| Framework gate | Run without `--framework` in Mode A — does it ask and wait? | Binary |
| Mode B framework required | Run with `--review none` and no `--framework` — does it stop? | Binary |
| No design recommendations | Grep output for recommendation language | Binary |
| Severity labeling | `--review none`: all severities say "Suggested" | Binary |
| Unreviewed draft banner | `--review none`: banner present in both .md and .html | Binary |
| Review subject record | Every output includes source URL, date, input type | Binary |
| AI transparency | Output states evaluations are AI-simulated | Binary |
| `--assume-defaults` transparency | Output states which defaults were assumed | Binary |

**Target:** 100% pass rate. These are not judgment calls — the skill
either follows its own spec or it doesn't.

---

## Practical evaluation protocol

Given a 2-week evaluation cycle, here's a phased approach:

**Phase 1 — Process compliance (days 1-2).** Run the existing eval
harness. All 8 judges should pass. This is table stakes before investing
in the more expensive dimensions.

**Phase 2 — Detection quality baseline (days 3-7).** Pick 2 interfaces
that are representative of what you'd actually evaluate (one simple, one
complex). Have 3 practitioners independently evaluate each. Run the skill
on both. Calculate precision, recall, F1, and novel valid findings.

**Phase 3 — Violation quality + severity calibration (days 5-8,
overlapping).** From the Phase 2 runs, sample 20 findings and score them
on the violation quality rubric. Have the same practitioners rate
severities on the skill's findings. Calculate weighted kappa and bias.

**Phase 4 — Independence + consistency (days 8-10).** Run the skill 5
times on one of the Phase 2 interfaces. Analyze evaluator overlap from
the pre-reconciliation outputs. Calculate stability metrics.

**Phase 5 — Synthesis (days 11-14).** Score across all six dimensions.
Identify the weakest dimension. That's your improvement target for the
next cycle.

---

## Benchmark table

| Dimension | Metric | Floor | Good | Excellent |
|-----------|--------|-------|------|-----------|
| Detection | F1 vs expert panel | 0.40 | 0.55 | 0.70 |
| Violation quality | Mean rubric score | 1.0/2.0 | 1.5/2.0 | 1.8/2.0 |
| Severity calibration | Weighted kappa | 0.25 | 0.40 | 0.60 |
| Evaluator independence | Coverage lift (3 vs 1) | 1.2x | 1.4x | 1.8x |
| Consistency | Finding stability (3/5 runs) | 0.45 | 0.60 | 0.75 |
| Process compliance | Pass rate | 0.875 | 1.0 | 1.0 |

---

## What this framework intentionally leaves out

- **Efficiency/cost** (tokens, time) — important for production but
  premature to optimize before quality is established.
- **User satisfaction** — how researchers feel about the output matters,
  but is a separate study.
- **Comparison across LLMs** — the framework evaluates the skill as a
  system, not the underlying model. If you swap models, re-run the same
  protocol.

---

## Sources

- [Hertzum & Jacobsen — The Evaluator Effect](https://dl.acm.org/doi/10.1145/1979742.1979788)
- [Severity rating scale reliability](https://dl.acm.org/doi/10.1145/2851581.2892454)
- [AIHeurEval — Multi-screen HE with MLLMs](https://link.springer.com/chapter/10.1007/978-3-031-94168-9_22)
- [Hybrid HE of IBM DOORS Next](https://doi.org/10.3390/app16020723)
- [Will AI replace inspectors?](https://arxiv.org/html/2510.17056v1)
- [Humans vs AI usability evaluator comparison](https://link.springer.com/chapter/10.1007/978-3-032-30044-7_9)
- [UXAgent — LLM agent usability testing](https://arxiv.org/abs/2502.12561)
- [UXCascade — Scalable agent feedback aggregation](https://arxiv.org/html/2601.15777)
- [PerceptUI — LLM agents as synthetic users](https://arxiv.org/html/2606.05697v1)
- [Can MLLMs model expert ratings?](https://link.springer.com/chapter/10.1007/978-3-032-30549-7_12)
- [LLM evaluation practical guide](https://arxiv.org/html/2506.13023v2)
- [Moving LLM evaluation forward — lessons from human judgment research](https://pmc.ncbi.nlm.nih.gov/articles/PMC12149859/)
