# UXD Design Direction

Workshop-ready PatternFly decision engine for UXD teams. The skill turns
PatternFly guidance, implementation evidence, and staged local preferences into
a recommendation and a screenshot-mock plan.

## Overview

Use this skill when the job is to decide what users should see, how close the
current implementation is to the PatternFly target, and whether repeated local
divergence is strong enough to stage as a project preference.

## What the skill reads and returns

### Reads

- The user request, ticket, or design brief
- The current repo, running UI, or screenshots when evidence exists
- The PatternFly decision tree and PatternFly docs for the target pattern
- Any staged project preferences that match the scenario

### Returns

- A short PatternFly divergence check
- A Recommendation block that only calls out divergence by default
- A screenshot-mock plan on the real product surface
- A short list of deeper follow-up fields the user can ask for

## Decision flow

1. Determine evidence mode.
2. Walk the tree.
3. Choose the PatternFly target.
4. Score the current implementation as `aligned`, `extension`, `drift`, or
   `unknown`.
5. Write build guidance from PatternFly docs and local component inventory.

Local habits do not pick the target. The tree chooses the target first, then
the skill checks whether the product is aligned with it.

## How staged preferences work

### Drift weight

- Measures how far the current implementation is from the PatternFly target
- Low numbers mean minor cleanup
- High numbers mean the current surface likely needs redesign

### Override weight

- Measures how strong a repeated local preference appears to be
- One example stays an exception
- Three comparable examples can become a strong local default candidate

New findings stay project-scoped until another product confirms the same
divergence. That lets the skill learn local reality without silently rewriting
PatternFly for the whole org.
