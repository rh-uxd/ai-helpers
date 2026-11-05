# Fullsend configuration

This repository configures Fullsend's Jira-to-GitHub path with explicit
`triage`, `code`, and `review` roles. Jira triage is the first decision gate;
code work requires a separate human-approved handoff.

## What is configured

- `config.yaml` enables the `triage`, `coder`, and `review` hosted roles and
  selects the built-in `triage`, `code`, and `review` agents on the Pi runtime.
- `harness/triage.yaml` limits Jira dispatch to exactly one
  `repo:rh-uxd/ai-helpers` label plus `ready-to-triage` or `/fs-triage`.
- `harness/code.yaml` limits Jira code dispatch to the same repository label
  plus `ready-to-code` or `/fs-code`.
- `triage` automatic code handoff is disabled for the initial rollout.
- `.github/workflows/fullsend-poll-jira.yml` polls bounded `UXDOPS` issues and
  supports manual validation before scheduled polling is enabled.
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

Jira credentials and the UIE-managed GCP identity are supplied through
protected GitHub Actions secrets and variables. Do not add their values to
repository files. This configuration does not grant Fullsend cross-repository
issue-creation targets.

## Maintainer notes

- `.github/workflows/fullsend.yaml` and `prioritize.yml` are managed by
  Fullsend; do not edit them directly.
- Keep `FULLSEND_JIRA_POLL_ENABLED` unset or false until the manual triage and
  code validation runs prove candidate selection, dispatch, and harness
  execution.
- Jira `retro` and `prioritize` are not part of this onboarding path.
- Keep the local review skill aligned with changes to contribution and
  governance documents.
- The Fullsend runtime, upstream harnesses, and lockfile are pinned as a
  compatible set at v0.54.0. Upgrade them together only when intentionally
  adopting a newer Fullsend release, using Fullsend's setup or scaffold-sync
  command.
- Regenerate the lockfile with
  `fullsend lock --all --update --fullsend-dir .fullsend` as part of that
  deliberate upgrade.
- Fullsend findings are advisory. Whether the review is a required merge check
  is controlled by repository branch protection.
