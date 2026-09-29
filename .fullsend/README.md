# Fullsend review profiles

Each directory is a complete, independently runnable Fullsend review profile.

- `claude/` uses the Claude runtime with Vertex AI and Haiku.
- `openai/` uses the Pi runtime with OpenAI's Luna model.

The manual workflows select the profile explicitly. Keep provider credentials
and runtime-specific settings inside the matching profile.

## Review policy

Fullsend identifies potential issues. Humans decide which issues must be fixed.

- `REVIEW_FINDING_SEVERITY_THRESHOLD` controls which findings are shown; it is
  not a merge-blocking policy. The current workflows use `medium`.
- A GitHub `REQUEST_CHANGES` review is Fullsend's synthesized assessment, not
  proof that every posted comment is mandatory.
- Treat findings as advisory until a human confirms the finding and its
  remediation.
- Fullsend is not a required merge check while this proof of concept is being
  evaluated.
