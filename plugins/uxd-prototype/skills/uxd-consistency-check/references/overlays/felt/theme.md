---
id: felt-theme
title: Felt root theme class
category: theme
severity: error
check: required-html-class
required_class: felt-theme
design_system: felt
version: 1
---

## Rule

This is a product-specific example overlay — opt-in and not a general
requirement. For projects explicitly adopting this example theme contract, the
root HTML element must include the `felt-theme` class. Select `--design-system
felt` and pass this file explicitly with `--guidelines`; it is not a global
default or an automatically inferred product dependency.

This uses the generic required-root-class check and scalar `required_class`
parameter. It only checks static HTML root class presence, not whether a theme
stylesheet is installed, tokens resolve, or rendered output is correct. Adapt
the class contract in a separately versioned local guideline when a project's
theme uses a different class.
