# Prepared requirements triage

**Question:** What evidence would verify each criterion for this change? The result
is a verification plan. It is not an observation of the prototype.

1. **Prepare with the designer.** Productize owns scope and phase approvals. The
   host prepares the evaluator packet from the authorized Jira or written source.
   Show the source ID/revision, exact criterion text and stable section/criterion
   IDs, changed action, and prototype URL/revision. The **designer** confirms or
   corrects the mapping before it is frozen. Reuse an already confirmed exact
   packet; ask only about missing or changed details. The designer can confirm
   the displayed mapping and approve Evaluate in one reply. Neither selecting a
   check nor providing a ticket implies either decision.
2. **Pass the selection, not a new intake request.** Use the evaluator's reviewed
   plan with one question and one allowed/selected step. After Evaluate approval,
   use `run-split-evaluation.js` with `--route quick --checks classify --no-fix`,
   the reviewed `--input` and `--plan`, and a fresh `--output` under the agreed
   external workspace's `artifacts/<KEY>/prototype-evaluations/<run-name>/`.
   Omit `--report`. No source or visual inspection, provider, browser or walkthrough
   is needed. Missing criteria, revision or evaluator access blocks triage; a
   missing live preview does not.
3. **Check before citing.** Validate the five canonical `pe-*.json` files and
   linked receipts with the evaluator's canonical validator. Match the returned
   run ID and artifact digest, reviewed packet/source hashes, prototype revision,
   and selected checks to this request. Use `checks/context.json` to join the
   stable source and criterion IDs to `checks/classify.json` and the canonical
   AC result. Check that each scoped criterion has a row and its verdict remains
   `NOT_RUN`. A valid hash identifies the saved bytes; it does not establish
   that the mapping is correct or that the UI works.
4. **Save and reopen.** In `run.md` record the native run ID, digest and a
   reviewer-openable relative link to its `pe-state.json`. Link the source
   snapshot and classification receipt alongside the finding. Before marking
   triage complete, open the links from the record and confirm the reviewer has
   access to the whole native run. On resume, read and validate that same run.
   If missing, stale, inaccessible or invalid, explain which claim cannot be
   supported. Do not silently rerun, substitute chat, or rewrite old evidence.
   Review approval creates only the Productize report; link to the same evidence.

**Synthetic citation as it would appear in `run.md`** (example siblings:
`artifacts/DEMO/productize/change-1/` and `artifacts/DEMO/prototype-evaluations/quick-1/`):

```markdown
- AC-1 — “Saving a filter adds it to the saved list.”
  [SPEC-1 §AC-1, rev 2](../../prototype-evaluations/quick-1/inputs/source.snapshot) ·
  [Quick classify: AC-1](../../prototype-evaluations/quick-1/checks/classify.json).
  NOT_RUN — still observe whether Save adds the item to the list. No UI observation was made.
```

For other selected checks, cite the evidence that supports the claim: a keyboard
observation on a revision-matched preview for accessibility, or the approved
observation/source **and** versioned catalog entry for PatternFly fit. A link to
a requirement, by itself, supports what was requested, not what happened.
