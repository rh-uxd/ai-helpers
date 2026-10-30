# Fullsend configuration

This repository configures Fullsend's `review` role for automated, read-only
pull-request review. The managed workflow also contains limited command and
status handling outside that review role.

## What is configured

- `config.yaml` enables the `review` role and selects the Pi runtime.
- `harness/review.yaml` uses the review harness tagged for the pinned Fullsend
  release; the runtime and harness are updated together.
- `skills/ai-helpers-review/` adds ai-helpers-specific contribution and
  architecture context without replacing the upstream review.
- `lock.yaml` pins the harness dependencies used by the workflow.

The local review skill uses `AGENTS.md`, `CONTRIBUTING.md`,
`CONTRIBUTING-SKILLS.md`, and other repository source-of-truth documents when
they apply to the changed files. It should report only actionable findings
supported by changed-file evidence and should not duplicate deterministic CI,
lint, security, ownership, or review-bot checks.

## Credentials and permissions

The workflow supplies `FULLSEND_GCP_PROJECT_ID` and
`FULLSEND_GCP_WIF_PROVIDER` from protected GitHub secrets. Do not add secret
values or GitHub Actions expressions to `config.yaml`.

Only the `review` role is enabled. This configuration does not grant Fullsend
cross-repository issue-creation targets.

## Maintainer notes

- `.github/workflows/fullsend.yaml` and `prioritize.yml` are managed by
  Fullsend; do not edit them directly.
- Keep the local review skill aligned with changes to contribution and
  governance documents.
- The Fullsend runtime, upstream review harness, and lockfile are pinned as a
  compatible set. Upgrade them together only when intentionally adopting a
  newer Fullsend release, using Fullsend's setup or scaffold-sync command.
- Regenerate the lockfile with
  `fullsend lock --all --update --fullsend-dir .fullsend` as part of that
  deliberate upgrade.
- Fullsend findings are advisory. Whether the review is a required merge check
  is controlled by repository branch protection.
