# Productize workflow eval

From the AI Helpers checkout, run this with
[Agent Eval Harness](https://github.com/fullsend-ai/agent-eval-harness):

```text
/agent-eval-harness:eval-run --config plugins/uxd-workshop/workflows/uxd-productize-review/eval/eval.yaml --no-llm-judges
```

The cases use the real UXD Assist route and Productize instructions in isolated
workspaces. They cover the editable menu and traceability record, scoped
accessibility and PatternFly results, resuming from artifacts, the Full
walkthrough gate, and recording the designer's next decision after Review.
Both deterministic judges must pass every case on Claude Sonnet 4.6.
No live prototype or Chai-bot session is used.

The repository's protected **Skill Evals** workflow also accepts
`uxd-productize-review` as `skill_name`. PRs detect and validate the suite
without executing it with credentials.
