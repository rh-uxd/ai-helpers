# Designer-facing consistency report

Use this template after the structured LLM report and any deterministic report have passed their validators. Present it in chat or in the evaluator's existing HTML report; the checker does not generate a second human report. Read the report, frozen guideline snapshot, scope report, and fix handoff before summarizing.

## Review summary

**Product and policy:** [product; source owner/authority when known; policy status]
**Guidance revision:** [branch/tag/full revision or `unverified`], retrieved [actual timestamp]
**Guidance evidence:** [selected source paths and hashes]
**Reviewed scope:** [prototype/workspace; changed files and lines; comparison base]
**Method coverage:** [semantic, deterministic, visual, and manual statuses separately]

### Findings

Repeat this block for each actionable or uncertain result:

#### [Human conclusion] — [violation | uncertain | no issue found]

- **Rule:** [product-scoped rule title and exact relevant quote]
- **Observed:** [specific changed UI or code behavior]
- **Why it matters:** [user or design consequence in this context]
- **Verdict and confidence:** [status; confidence]. Severity is source policy metadata, not confidence.
- **Exception/context:** [exception evidence considered, or exact missing fact]
- **Evidence:** [guideline source plus code path/line, screenshot, or case ID]
- **Next action:** [focused question or approved action]
- **Fix status:** [not proposed / proposed but unapplied / separately approved]

For `uncertain`, identify the missing fact and ask a focused question. Do not include a proposed fix. For `violation`, describe only the validated proposal; keep it unapplied until separate explicit approval. `no_issue_found` is an LLM judgment, not deterministic compliance.

### Coverage and limits

- **Selected rules:** [count and identities]
- **Semantic review:** [status counts; unresolved verifier disagreement, if any]
- **Deterministic checks:** [evaluated, unevaluated, and incomplete rules; never merge LLM results]
- **Visual/manual evidence:** [what was reviewed or explicitly not run]
- **Not evaluated:** [unsupported, unavailable, not applicable, or out-of-scope items]
- **Artifacts:** [consumer-local report, snapshot, scope, and fix-handoff paths]

Close with the next designer decision. Never imply blanket product compliance when any selected rule is uncertain, unsupported, unavailable, skipped, not applicable, or unevaluated. Do not transfer guidance between products or infer authority from a framework label, dependency, or an index's `approved` field.
