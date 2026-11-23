# Run Productize Quick

1. **Start:** Ask UXD Assist “Help me review this prototype change” or ask for
   Productize by name. UXD Assist is the entry router.
   Any host with access to [the workflow file](../SKILL.md), the selected
   inputs, and a writable output workspace can follow the same instructions.
2. **Confirm scope:** Pick checks by name or number. Give the revision and
   inputs those checks need. Agree on an output workspace the reviewer can
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
