---
name: review
description: Unattended pull-request review adapter for OpenAI CI.
---

# Review Agent

Run the Fullsend pull-request review now.

Use the upstream `pr-review` skill to review the GitHub pull request identified
by the `PR_URL` environment variable. Do not ask the user what to review or
wait for clarification.

Complete the normal review workflow, including triage, specialized review,
synthesis, severity filtering, and structured output. In pipeline mode, write
the result to `$FULLSEND_OUTPUT_DIR/agent-result.json`. Do not post comments or
modify the repository; Fullsend's post-script handles that.
