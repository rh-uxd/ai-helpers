# Slides artifact specification

A slide deck records the spec it was built against in `metadata.json` as `specVersion`.

**Current spec: 0.1.0.** New decks from `uxd-slides-create` write `"specVersion": "0.1.0"`. The version string is [current.json](current.json). The normative layout is [0.1.0](0.1.0.md).

| Version | Status | Document |
|---|---|---|
| 0.1.0 | current | [0.1.0.md](0.1.0.md) |

Validation accepts a deck only when `specVersion` is the current version. An older known version is not compliant until an upgrade script rewrites it. An unknown version is not a slides artifact this skill can read.

## Upgrades

Upgrade scripts live in [upgrades/](upgrades/README.md). A script named `{from}-to-{to}.mjs` rewrites a deck directory in place and sets `specVersion` to `{to}`. Chain those scripts to bring an older deck up to the current spec. Do not hand-edit a deck to jump versions.
