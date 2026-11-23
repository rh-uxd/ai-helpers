# Run Productize Quick

1. **Start:** Ask UXD Assist “Help me review this prototype change” or ask for
   Productize by name. UXD Assist is the entry router.
   Any host with access to [the workflow file](../SKILL.md), the selected
   inputs, and a writable output workspace can follow the same instructions.
2. **Confirm scope:** Say what changed for the user (for example, “Save a
   filter and see it in the saved list”). No journey map is required. Pick
   checks by name or number. For “what still needs verification?”, choose
   requirements triage and confirm the cited criteria. Give the revision and
   inputs the chosen checks need. Agree on an output workspace the reviewer can
   open, outside the prototype checkout. Confirm scope to start `run.md`;
   approve Evaluate when ready to run.
3. **Open the results:** Start at
   `artifacts/<KEY>/productize/<run-name>/run.md`. Use this path to ask
   “What was blocked?” or “Show me the source-only findings” without
   repeating checks.
4. **Review and decide:** Approve Review to create `productize-report.md`.
   Tell the assistant which next action and owner to record. Recording a
   decision does not apply fixes. Verify the reviewer can open the package;
   a path on another machine is not a shared link.

For a dry run, fill the [traceability record](traceability-record.md) by hand
if needed. When comparing entry routes, check whether designers
can choose, review, and reopen the same results.

## Local evidence handoff

Hosts consuming saved local text results should prepare the evidence before
asking a model to interpret it. Use Python 3 and the bundled
`scripts/prepare_evidence.py` from the resolved workflow directory:

```bash
python3 scripts/prepare_evidence.py --producer "$ACTUAL_PRODUCER" \
  --target "$TARGET_REV" --observed "$OBSERVED_REV" \
  --result "$TASK_RESULT" --support "$BUILD_RECORD" --link-from "$REVIEW_DIR"
```

Pass only authorized files. Identify the producer and observed revision from
the reviewed source, not the current URL or a model's guess. Omit `--observed`
if identity cannot be established. For an approved PF comparison pass the
observation as `--result`, versioned guidance as `--support`, and the resolved
`--pf-router` and `--catalog` files (or `--direct-reason` instead of the router
if it is unavailable). `--link-from` is the directory containing the document
that will show the links; for chat use the agreed reviewer workspace.

The helper returns JSON with the opened source texts, hashes, coverage scope,
and a Markdown `record_line`; it writes no files. Use the source contents for
the scoped comparison, include the record line intact, and take any structured
coverage fields from that same result. Missing files block attribution. Check
reviewer access separately. If the host cannot run Python, open the same files
and perform these checks directly; if it cannot establish the route, revision,
or evidence links, do not claim completion. Native requirements triage still
requires the evaluator's canonical validator.
