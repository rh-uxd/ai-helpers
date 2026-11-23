# Productize workflow eval

From the AI Helpers checkout, run this with
[Agent Eval Harness](https://github.com/fullsend-ai/agent-eval-harness):

```text
/agent-eval-harness:eval-run --config plugins/uxd-workshop/workflows/uxd-productize-review/eval/eval.yaml --no-llm-judges
```

The cases start with UXD Assist and use the source Productize instructions in isolated
workspaces. They cover the editable menu and traceability record, scoped
accessibility and PatternFly results, resuming from artifacts, declining a
walkthrough request, and recording the designer's next decision after Review.
Both deterministic judges must pass every case on Claude Sonnet 4.6.
No live prototype or Chai-bot session is used.

Use the explicit config above to test this workflow. Changes to Productize
do not automatically select this suite in PR CI.
