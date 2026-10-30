# Product guideline index (template)

Create a product-owned README index **only when requested**. Start with the
README-only example below; add optional [sources.json](sources.json) for richer
metadata or external locators. This proposed layout is not an
organization-wide standard. Existing indexes can stay in their current locations.
Replace these template notes and illustrative entries when adopting an index;
do not invent product ownership or approval.

## README-only example

Create the linked local Markdown before using this example. The `#rule` fragment
selects an existing ATX heading in that document; no fragment offers a whole-document
candidate that still requires explicit scope selection and approval.

```markdown
---
product: Example product
release: unspecified
---
# Product guidelines

## Controls
[Controls](rules/controls.md#rule)
```

## Topics

| Topic | Source ID | Rule IDs | Title / scope | Status |
| --- | --- | --- | --- | --- |
| controls | example-controls | none assigned | Controls / settings forms | draft |

The optional sidecar's example locator is `rules/controls.md`; relevant examples and assets are
listed in the sidecar. These placeholders are not bundled policy and need not
exist during sidecar metadata discovery. README-linked local Markdown must exist,
but its contents are not opened during discovery. Prefer product-owned Markdown with assets and code
examples when useful. External sources should identify a specific document,
section, or frame, not a folder, entire Figma file, or site crawl.

## Human editing and metadata contract

Without a sidecar, the resolver parses the chosen README's local Markdown links,
listing headings, and scalar product/release frontmatter. Links are candidates,
not adopted policy. External links are never followed automatically.
With `sources.json`, the sidecar supplies candidate metadata instead; keep the
overview consistent with it. Discovery opens only the README and optional sidecar,
not linked rule contents. Selection reads and hashes only explicitly selected local
rules, preserving authored IDs or exact relative path-derived identities. Sidecar-local
model selections also require explicit section or whole-document scope.
Do not feed the JSON sidecar through the checker rule loader.

Sidecar version `1.0.0` requires exactly `schema_version`, `product`, `release`,
and `sources`. Product/release can be `null` when unknown. Each source requires:

- `id`, `title`, `topic`, `scope`: stable source ID, title, topic ID, applicability.
- `rule_ids`: known source-authored rule IDs; use `[]` if none, never invent them.
- `owner`, `authority`: nonempty text when known, otherwise `null`.
- `policy_status`: `approved`, `draft`, or `deprecated`, asserted by the index.
- `locator`: one locator object; `examples` and `assets`: arrays of locator objects.

Source, topic, and rule IDs use letters/digits plus `.`, `_`, `-`, starting with a
letter/digit. Source IDs are unique within an index; rule IDs within each entry
are unique. Fields are required; unknown fields and duplicate JSON keys error.
Use separate indexes for different product/releases. Do not put secrets or
signed URLs in any metadata.

### Locator objects (exact fields)

| `kind` | Other required fields |
| --- | --- |
| `local` | `path`: relative to this index's directory, never absolute or `..` |
| `repository` | `url`, `revision`: full 40-character commit SHA, `path`: repository-relative |
| `web` | `url`, `section`: exact section identity or `null` |
| `gdrive` | `document_id`, `section`: exact section identity or `null` |
| `figma` | `file_key`: required key, `branch_key`: key or `null`, `node_ids`: exact colon-form IDs |

URLs must be HTTP(S) without credentials, query or fragment. Preserve meaningful
section/branch/node identity in structured fields instead of stripping it away.
Provider keys use letters/digits, `_`, `-`; node IDs use `12:34`, not `12-34`.
Values are validated, never normalized. Empty node lists and null sections are
only discovery hints: acquisition must resolve/approve exact scope separately.
These locator shapes describe metadata, not connector availability or retrieval.
Local paths and all index overrides are confined to the consumer workspace;
traversal and symlink components are rejected, including links that stay inside.

## Resolver API (stdlib, offline)

From the installed checker `scripts/` import `guideline_resolver`:

```python
from guideline_resolver import discover_indexes, read_index

candidates = discover_indexes(workspace, index=None, root=None)
metadata = read_index(workspace, chosen_index, topics=["controls"])
```

`index` is an explicit index file; `root` is an explicit index directory containing
`README.md`. Overrides are mutually exclusive and take priority over defaults.
With neither, discovery checks only `.design/guidelines/README.md`,
`.design/product-design/guidelines/README.md`, and
`.design/product/design-guidelines/README.md`. It does not read those files or
scan directories. Results are `{status, candidates}` with status `absent`,
`candidates`, or `ambiguous`; each candidate has `index` (absolute path) and
`origin` (`explicit`, `conventional`, `legacy`). Multiple candidates require an
explicit choice; even one candidate is **not adopted policy**.

`read_index` requires a chosen index. It returns schema version, absolute `index`
and optional `sidecar` paths, exact-byte `index_sha256` / `sidecar_sha256`, product/release,
sorted available topic IDs in `topics`, and only requested-topic metadata in
`sources`. Omitted/empty topics returns no sources. Unknown topics error.
Without a sidecar, `sidecar` and `sidecar_sha256` are null; linked README section
headings supply the available topics. When present, the complete small sidecar is
validated. Neither mode opens linked document contents during discovery.
Index reads are limited to 64 KiB Markdown and 256 KiB JSON, both UTF-8 regular
files. Malformed/missing configured files raise `ValueError`; filesystem access
failures raise `OSError`. A missing default index is `absent`, not a pass.

Topic requests only expose metadata, not consent. `approved` in an index is not
user approval, authority verification, supported-rule coverage, or a compliance
pass. Selection receipts, bounded acquisition, immutable staging, adapters and the evaluator
reuse seam are documented in the checker's
[selection workflow](../../references/selection-workflow.md). The template's null
product must be replaced with a real product identity before selection. This may
come from index metadata or the explicit `product_identity` selection argument
bound to a real user/task instruction; it does not require `sources.json` or a
README edit. Unknown owner/authority/release stays null rather than invented. The illustrative draft
entry cannot execute by default; any exception needs explicit source-specific
consent. Retrieved policy text cannot grant approval or model-review permission.
An unchanged confirmed selection may be reused; material/source/authority/scope
changes require renewed confirmation, and unknown remote currentness stays visible.
Existing explicit `--guidelines` and frozen manifest replay remain independent;
the analyzer does not invoke discovery or load these candidates implicitly.
