# Drift and override registry (staging area)

`decision-tree.md` is the master file. It always wins on the PatternFly target.
This registry holds scored local overrides and drift evaluations that have **not
yet been promoted** into the tree.

The scoring model is reusable across products, but staged preferences must
begin as **project-scoped evidence**.

## Registry location

[patternfly-preferences.json](patternfly-preferences.json)

## What each entry stores

Each entry should capture the gap between the current implementation and the
PatternFly target, plus the strength of the local convention:

- `scope.level`
- `scope.projects`
- `scope.sourceBoard`
- `patternflyFit`
- `currentPattern`
- `patternflyTarget`
- `driftWeight`
- `overrideWeight`
- `localOverrideStatus`
- `evidenceMode`
- `evidence`
- `prefer`
- `because`
- `rejectedAlternatives`
- `recommendedDelta`

## Weight rubric

### `patternflyFit`

- `aligned` — current behavior already matches the PF target
- `extension` — the product is adding domain-specific behavior inside a valid PF
  shell
- `drift` — current behavior is using the wrong PF shell or interaction model
- `unknown` — more evidence or PF interpretation is needed before calling it
  right or wrong

### `driftWeight`

- `1` close to the PatternFly target
- `2` small drift
- `3` moderate drift
- `4` major mismatch
- `5` wrong surface or interaction model

### `overrideWeight`

- `1` one-off exception
- `2` weak signal or manual stage only
- `3` candidate local preference
- `4` strong local default
- `5` explicit site standard

Automatic rules:

- one comparable example -> `overrideWeight <= 2`
- two comparable examples -> `overrideWeight = 3`
- three or more comparable examples -> `overrideWeight = 4`
- `5` requires explicit user or board approval as a site standard
- no implementation evidence -> do not infer above `2`

## Scope rubric

- `project` — evidence comes from one product only
- `multi-project` — the same divergence is confirmed on two or more products
- `org-candidate` — stable cross-project pattern worth considering for broader
  promotion
- `org-standard` — explicitly approved cross-org default

## How to check

For each entry whose `intentIds`, `scenarioId`, or `context` keywords overlap
with the current scenario:

1. Compare `currentPattern` and `patternflyTarget` to the current scenario.
2. Use `patternflyFit` to decide whether the current pattern is aligned, a
   valid extension, true drift, or still unresolved.
3. Use `driftWeight` as the severity of the gap from PatternFly, not as a
   reason to overrule the tree.
4. Use `overrideWeight` to rank local convention strength among competing
   staged entries.
5. Prefer scope in this order: exact current-project match, then
   `multi-project`, then `org-candidate`, then `org-standard`.
6. If multiple entries still match, prefer the more specific scenario first,
   then the higher `overrideWeight`, then the newer `committedAt`.
7. If an entry conflicts with the tree, the tree still wins on the PF target.
   Flag the conflict to the user.
8. Respect `prefer.avoid` as advisory context unless the tree explicitly
   recommends one of the avoided patterns.
9. Note `rejectedAlternatives` when a likely PF alternative has already been
   tried and rejected for this scenario.

## Initial evaluation

On the first relevant run, the skill should try to score both drift and local
override strength.

- Full or partial evidence -> compare implementation to the PF target and
  auto-draft a staged entry when repeated divergence appears
- Net-new product behavior in a valid PF shell -> classify it as `extension`
  first
- Thin guidance or thin evidence -> use `unknown` and carry an open design
  question instead of over-scoring drift
- One project only -> stage it as `project`
- Two or more projects -> consider `multi-project` or `org-candidate` if the
  divergence is still comparable
- Manual correction from the user -> stage it with `overrideWeight` `1` or `2`
  unless stronger site evidence already exists
- No evidence -> do not auto-stage a local convention

The skill may draft a staged entry automatically, but it should still ask the
user to approve before writing the registry or a project-board update.

## Update and promotion cycle

```text
User disagrees with tree default
        ↓
Implementation divergence or manual correction is scored in patternfly-preferences.json
        ↓
Same override keeps appearing across sessions or product issues
        ↓
overrideWeight rises, rationale sharpens, board labels may be updated
        ↓
User promotes it: edit decision-tree.md directly
        ↓
Delete or downgrade the staged JSON entry; the rule now lives in the tree
```

`driftWeight` can go down over time if implementation moves closer to the PF
target. `overrideWeight` should go down if the pattern stops recurring or the
site chooses to remediate it.

## When no entry matches

Use the tree defaults and PatternFly docs. If implementation evidence shows
repeated divergence, draft a staged override candidate. If the user disagrees
with the result and there is no implementation evidence, offer to stage a
manual override for future review.

Do not write to registry files or project issues from this skill unless the
user explicitly asks.
