# Slides spec upgrades

No upgrades yet. 0.1.0 is the first spec.

When a later spec changes folders or metadata fields, add `{from}-to-{to}.mjs` in this directory. The script exports `upgrade(deckDir)`. It rewrites that deck in place and sets `metadata.specVersion` to `{to}`.

Run upgrades in order. A deck at 0.1.0 reaches 0.3.0 by running `0.1.0-to-0.2.0.mjs`, then `0.2.0-to-0.3.0.mjs`.
