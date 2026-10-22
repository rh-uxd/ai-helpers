---
id: css-token-usage
title: PatternFly color tokens
category: foundations
severity: warning
check: css-token-usage
design_system: patternfly
version: 1
source_url: https://www.patternfly.org/tokens/all-patternfly-tokens/
---

## Rule

Prefer semantic PatternFly tokens for UI colors when an equivalent exists.
Source matches for literal color values are candidates requiring review; a
literal may be intentional, an illustration color, or a documented exception.
Do not invent token names. Confirm replacements with installed token definitions
or explicitly requested current documentation.

This limited deterministic check covers hex and rgb/hsl color declarations,
not all spacing, typography, token validity, or complete PatternFly compliance.
See the complementary `pf-css-token-check` skill for broader review.
