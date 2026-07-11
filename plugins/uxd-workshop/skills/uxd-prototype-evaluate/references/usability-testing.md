# Usability Testing Procedure

Full procedure for simulated usability testing. Load this when evaluation depth is **full** or **deep**.

## Research Context

Check for `.context/research-context/` in the workspace or artifact directory.

**If research context exists**, read:
- `personas.md` or `personas.yaml` — Use these personas for the walkthrough.
- `journey-maps/` — Reference existing journey maps for task context.
- `research-findings.md` — Factor prior research into predictions.

**If no research context exists**, construct three generic personas:

| Persona | Description | Technical Skill | Domain Knowledge | Frequency |
|---------|-------------|-----------------|-------------------|-----------|
| Primary user | Core target user who performs this task regularly | Medium | High | Daily |
| Power user | Expert who uses advanced features and shortcuts | High | High | Daily |
| Infrequent user | Occasional user who may not remember the interface | Low | Low–Medium | Monthly |

## Step U1: Read the Prototype

Read all HTML files. For each screen identify:

- **Screen name and purpose**
- **Navigation elements** — How does the user get here? Where can they go?
- **Interactive elements** — Buttons, forms, links, toggles, dropdowns
- **Content areas** — Data displays, text, media
- **States** — Default, loading, empty, error, success, disabled

Build a mental map: entry point → screens → exit points.

## Step U2: Extract User Stories

From the RFE snapshot, extract user stories:

> As a {role}, I want to {action} so that {outcome}.

If no explicit stories exist, infer from the described functionality. Mark each as primary or secondary.

## Step U3: Define Task Scenarios

Create 4–8 scenarios covering:

1. **Primary happy path** — Most common successful completion
2. **Secondary workflow** — Less common but important path
3. **Error recovery** — What happens when something goes wrong
4. **Discovery/navigation** — Can a new user find the feature

Each scenario:

```
Scenario: {Name}
Persona: {Which persona}
Goal: {What the user is trying to accomplish}
Starting point: {Where the user begins}
Success criteria: {How we know they succeeded}
```

## Step U4: Walk Through Each Scenario

For each scenario, simulate the persona's journey step by step:

1. **Entry point** — Where does the user start?
2. **Navigation** — What do they click first? Is the target obvious?
3. **Comprehension** — Do they understand the screen? Are labels clear?
4. **Interaction** — Can they complete the action? Are affordances visible?
5. **Feedback** — Does the system confirm their action?
6. **Recovery** — If they make a mistake, can they recover?
7. **Completion** — Do they reach the goal state? Is it clear they're done?

For each step note:

- **Predicted success**: yes / probably / uncertain / unlikely / no
- **Friction level**: none / low / medium / high / blocking
- **Observation**: What specifically causes friction?

## Step U5: Identify Issues

Categorize issues:

| Category | Description |
|----------|-------------|
| Task completion blocker | Cannot complete the task at all |
| Friction point | Can complete but with unnecessary difficulty |
| Confusion point | Would pause, unsure what to do next |
| Missing affordance | Interactive element doesn't look interactive |
| Error recovery gap | Cannot recover without starting over |

Assign severity:

| Severity | Label | Description |
|----------|-------|-------------|
| S1 | Critical | Prevents task completion. No workaround. |
| S2 | Major | Significantly degrades experience. Non-obvious workaround. |
| S3 | Minor | Brief friction. User can self-recover. |
| S4 | Enhancement | Not a problem, but an improvement opportunity. |

## Step U6: Apply Heuristic Evaluation

Evaluate against Nielsen's 10 heuristics:

| # | Heuristic | Rating | Findings |
|---|-----------|--------|----------|
| 1 | Visibility of system status | Pass / Partial / Fail | {findings} |
| 2 | Match between system and real world | Pass / Partial / Fail | {findings} |
| 3 | User control and freedom | Pass / Partial / Fail | {findings} |
| 4 | Consistency and standards | Pass / Partial / Fail | {findings} |
| 5 | Error prevention | Pass / Partial / Fail | {findings} |
| 6 | Recognition rather than recall | Pass / Partial / Fail | {findings} |
| 7 | Flexibility and efficiency of use | Pass / Partial / Fail | {findings} |
| 8 | Aesthetic and minimalist design | Pass / Partial / Fail | {findings} |
| 9 | Help users recognize, diagnose, recover from errors | Pass / Partial / Fail | {findings} |
| 10 | Help and documentation | Pass / Partial / Fail | {findings} |

## Step U7: Generate Usability Report

Write `.artifacts/{ID}/report-usability.md`:

```markdown
---
prototype_id: {ID}
report_type: usability
personas_used: {count}
scenarios_tested: {count}
issues_found: {count}
critical_issues: {count of S1}
generated_at: {ISO-8601 timestamp}
---

# Usability Report: {ID}

## Summary

{2-3 sentence overview. Assessment: Strong / Adequate / Needs Work / Significant Issues}

**Issues by severity:**

| Severity | Count |
|----------|-------|
| S1 — Critical | {n} |
| S2 — Major | {n} |
| S3 — Minor | {n} |
| S4 — Enhancement | {n} |

## Personas

| Persona | Description | Tech Skill | Domain Knowledge | Frequency |
|---------|-------------|------------|-------------------|-----------|
| {name} | {description} | {level} | {level} | {frequency} |

## Task Scenarios

| # | Scenario | Persona | Predicted Success | Friction Level |
|---|----------|---------|-------------------|----------------|
| 1 | {name} | {persona} | {level} | {level} |

## Detailed Walkthroughs

### Scenario 1: {Name}

**Persona:** {name}
**Goal:** {goal}
**Starting point:** {start}
**Result:** {success/partial/failure}

| Step | Action | Screen | Success | Friction | Observation |
|------|--------|--------|---------|----------|-------------|
| 1 | {action} | {screen} | {level} | {level} | {note} |

## Heuristic Evaluation

| # | Heuristic | Rating | Key Findings |
|---|-----------|--------|-------------|
| 1 | Visibility of system status | {rating} | {findings} |

## Issues (Severity-Ranked)

### S1 — Critical
- **{Issue title}** — {Description}. Found in: {screen}. Impact: {impact}. Recommendation: {fix}.

### S2 — Major
- **{Issue title}** — {Description}. Recommendation: {fix}.

### S3 — Minor
- **{Issue title}** — {Description}. Recommendation: {fix}.

### S4 — Enhancement
- **{Issue title}** — Suggestion: {improvement}.

## Recommendations

{Prioritized top 5 recommendations, ordered by impact}
```
