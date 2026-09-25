# Fullsend Claude/Vertex CI Setup

This repository's working Claude proof of concept is an on-demand GitHub Actions
workflow for Fullsend PR reviews.

## What it does

- `.github/workflows/fullsend-review.yml` runs only through `workflow_dispatch`.
- The workflow accepts a PR number and runs Fullsend v0.43.0.
- `.fullsend/config.yaml` selects the Claude runtime.
- `.fullsend/harness/review.yaml` composes the upstream Fullsend review harness
  and supplies Vertex-specific sandbox context.
- `.fullsend/agents/review.md` is the unattended adapter that tells the upstream
  review skill to review the PR in `PR_URL`.
- The workflow uses the `GCP_CREDENTIALS` repository secret to provide the
  service-account credential for Vertex AI.
- The primary review uses Haiku. The adversarial challenger is configured to use
  Haiku as well.

## Running it

1. Open the repository's **Actions** tab.
2. Select **Fullsend Manual PR Review**.
3. Select **Run workflow** and enter the PR number.
4. Fullsend runs the review and posts the structured result to the PR.

## Important boundaries

- This workflow is intentionally manual while the proof of concept is being
  validated.
- The Vertex credential is personal and temporary; it must be replaced with a
  team-owned credential before broad adoption.
- The OpenAI experiment is separate under `.fullsend/openai/` and does not change
  this Claude/Vertex configuration.
