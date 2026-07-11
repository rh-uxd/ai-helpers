# Desirability Study Procedure

Full procedure for desirability evaluation. Load this when evaluation depth is **deep**.

Evaluates the prototype's aesthetic and emotional impact using methods adapted from the Microsoft Desirability Toolkit. Measures whether the prototype *feels* right — not just whether it works.

## Step D1: Read the Prototype

Analyze with a focus on subjective qualities:

- **Visual design** — Color palette, typography, whitespace, visual weight, contrast
- **Layout** — Density, grouping, alignment, visual hierarchy, breathing room
- **Microcopy tone** — Formal vs casual, technical vs friendly, active vs passive
- **Imagery and iconography** — Style, consistency, emotional tone
- **Information density** — Sparse vs dense, progressive disclosure vs upfront
- **Interaction patterns** — Smooth vs abrupt, guided vs exploratory

Note first impressions and emotional reactions screen by screen.

## Step D2: Load Personas

**If research context exists** (`.context/research-context/`), use those personas.

**If not**, use three default evaluation lenses:

| Lens | Perspective | Focus |
|------|-------------|-------|
| End user | Primary daily user | Does it feel efficient and pleasant for repeated use? |
| Evaluator | Stakeholder seeing this for the first time | Does it inspire confidence and look professional? |
| New user | Someone encountering this product for the first time | Does it feel welcoming, clear, and not overwhelming? |

## Step D3: Word Association

### Word Lists

**Positive words:**

Accessible, Advanced, Appealing, Approachable, Clean, Clear, Collaborative, Compelling, Comprehensive, Confident, Connected, Consistent, Contemporary, Credible, Customizable, Delightful, Dependable, Desirable, Easy to use, Effective, Efficient, Empowering, Engaging, Enjoyable, Essential, Exceptional, Exciting, Expected, Familiar, Fast, Flexible, Fresh, Friendly, Fun, High quality, Innovative, Inspiring, Integrated, Intuitive, Inviting, Meaningful, Modern, Motivating, Novel, Organized, Personal, Playful, Pleasant, Polished, Powerful, Predictable, Professional, Refined, Relevant, Reliable, Responsive, Satisfying, Seamless, Simple, Sleek, Smart, Sophisticated, Stable, Stimulating, Straightforward, Time-saving, Trustworthy, Understandable, Useful, Valuable

**Negative words:**

Boring, Busy, Cheap, Cluttered, Complex, Confusing, Dated, Difficult, Disconnected, Distracting, Dull, Fragile, Frustrating, Generic, Gimmicky, Hard to use, Heavy, Impersonal, Inadequate, Inconsistent, Intimidating, Irrelevant, Misleading, Mundane, Noisy, Old-fashioned, Ordinary, Outdated, Overwhelming, Painful, Rigid, Slow, Stale, Stressful, Tedious, Unapproachable, Unattractive, Unclear, Unconvincing, Unfamiliar, Unfinished, Unpredictable, Unprofessional, Unreliable, Unstable

**Neutral words:**

Academic, Basic, Business-like, Casual, Complex, Conservative, Conventional, Corporate, Dense, Detailed, Dry, Enterprise, Formal, Functional, Industrial, Literal, Mechanical, Minimal, Neutral, Plain, Practical, Sparse, Standard, Technical, Traditional, Typical, Utilitarian

### Per-Screen Analysis

For each screen, from each persona/lens:

1. Select **5 words** (from any list) that best describe the screen's feel
2. Note whether words are predominantly positive, negative, or neutral
3. Flag screens where word selections conflict between personas

### Consistency Score

Across all screens:

- **High** (8-10): Same 3+ words apply to every screen. Unified feel.
- **Medium** (5-7): Most screens share a feel, 1-2 diverge.
- **Low** (1-4): Screens feel like different products. No unified tone.

## Step D4: Emotional Response Mapping

Map responses across 5 dimensions for each flow stage:

| Dimension | Description |
|-----------|-------------|
| Confidence | Does the user feel sure about what to do? |
| Control | Does the user feel in charge? |
| Satisfaction | Does completing actions feel rewarding? |
| Trust | Does the interface feel reliable and safe? |
| Engagement | Does the interface hold attention? |

For each stage (entry, navigation, task execution, completion), rate: High / Medium / Low.

Note sharp drops — a flow that starts with high confidence but drops to low at a critical step signals a design problem.

## Step D5: Preference Comparison

Compare against 2-3 alternatives:

1. **Other prototypes** — If multiple exist for the same RFE
2. **Industry patterns** — How do AWS/Azure/GCP handle the equivalent flow?
3. **Conceptual alternatives** — Describe 2 alternative directions and compare

For each: What does this prototype do better? What does the alternative do better?

## Step D6: Calculate Desirability Score

Score 1-10 based on four weighted factors:

| Factor | Weight | Measures |
|--------|--------|----------|
| Word association quality | 30% | Ratio of positive to negative, alignment with brand |
| Emotional journey smoothness | 30% | Consistency across stages, absence of drops |
| Preference ranking | 20% | Ranking against alternatives |
| Brand coherence | 20% | Whether tone matches intended identity |

**Scoring rubric:**

| Score | Label | Description |
|-------|-------|-------------|
| 9-10 | Exceptional | Overwhelmingly positive. Smooth emotional journey. Preferred over all alternatives. |
| 7-8 | Strong | Predominantly positive. Consistent journey. Competitive with alternatives. |
| 5-6 | Adequate | Mix of positive and neutral. Some inconsistency. On par with alternatives. |
| 3-4 | Weak | Neutral to negative. Noticeable drops. Less preferred. Brand misalignment. |
| 1-2 | Poor | Predominantly negative. Significant emotional issues. Strongly less preferred. |

## Step D7: Generate Desirability Report

Write `.artifacts/{ID}/report-desirability.md`:

```markdown
---
prototype_id: {ID}
report_type: desirability
desirability_score: {1-10}
consistency_score: {high|medium|low}
personas_used: {count}
generated_at: {ISO-8601 timestamp}
---

# Desirability Report: {ID}

## Summary

{2-3 sentence overview. Assessment: Exceptional / Strong / Adequate / Weak / Poor}

**Desirability Score: {score}/10**

| Factor | Weight | Score | Notes |
|--------|--------|-------|-------|
| Word association quality | 30% | {sub-score} | {note} |
| Emotional journey smoothness | 30% | {sub-score} | {note} |
| Preference ranking | 20% | {sub-score} | {note} |
| Brand coherence | 20% | {sub-score} | {note} |

## Word Association Results

### Per-Screen Breakdown

| Screen | Top 5 Words | Tone | Notes |
|--------|-------------|------|-------|
| {screen} | {word1, word2, word3, word4, word5} | {positive/neutral/negative} | {notes} |

**Consistency score: {high/medium/low}** — {explanation}

### Most Common Words

| Word | Frequency | Category |
|------|-----------|----------|
| {word} | {count} | {positive/negative/neutral} |

## Emotional Response Map

| Flow Stage | Confidence | Control | Satisfaction | Trust | Engagement |
|------------|------------|---------|-------------|-------|------------|
| Entry | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} |
| Navigation | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} |
| Task execution | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} |
| Completion | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} | {H/M/L} |

{Note any sharp drops and their likely cause}

## Preference Comparison

| Dimension | This Prototype | {Alternative 1} | {Alternative 2} |
|-----------|---------------|-----------------|-----------------|
| First impression | {assessment} | {assessment} | {assessment} |
| Task flow feel | {assessment} | {assessment} | {assessment} |
| Visual polish | {assessment} | {assessment} | {assessment} |
| Emotional tone | {assessment} | {assessment} | {assessment} |
| Overall preference | {rank} | {rank} | {rank} |

## Recommendations

{Prioritized 3-5 desirability improvements}
```
