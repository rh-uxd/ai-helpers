# Migration Guide

The PatternFly AI Helpers (`patternfly/ai-helpers`) and UXD AI Helpers repositories are merging into a single monorepo at `rh-uxd/ai-helpers`. Plugin APIs, install commands, and skill behavior are unchanged — only the repo location and directory structure change.

## Why

Fragmented plugin ecosystem across two repos, duplicated CI, and inconsistent conventions. One repo means one contribution path, shared automation, and unified plugin discovery.

## What Changes for Contributors

| Before | After | Effective |
|--------|-------|-----------|
| Clone `patternfly/ai-helpers` | Clone `rh-uxd/ai-helpers` | Phase 2 |
| Open PRs against `patternfly/ai-helpers` | Open PRs against `rh-uxd/ai-helpers` | Phase 2 |
| PF skills at `plugins/<name>/skills/` | PF skills at `plugins/patternfly/<name>/skills/` | Phase 2 |
| File issues at `patternfly/ai-helpers` | File issues at `rh-uxd/ai-helpers` | Phase 2 |
| Install from `patternfly/ai-helpers` | Install from `rh-uxd/ai-helpers` | Phase 3 |

## Staged Rollout

### Phase 1 — Parallel Operation (2 weeks)

- Combined repo is live and accepting PRs
- `patternfly/ai-helpers` remains fully functional — no changes to existing workflows
- Both repos have CI running, both accept contributions
- A banner is added to the PF repo README linking to the combined repo
- PRs opened against the old repo get a comment with the equivalent path in the new repo
- Maintainers cherry-pick PRs that land in the old repo into the new one

### Phase 2 — Soft Cutover (1 week)

- `patternfly/ai-helpers` README is updated to redirect — "this repo has moved"
- New PRs against the old repo get a comment: "Please re-target to `rh-uxd/ai-helpers`"
- Old repo CI stays green but stops running on new commits
- All install/reference documentation points to the new repo

### Phase 3 — Archive

- `patternfly/ai-helpers` is archived on GitHub
- README remains as a permanent redirect document
- If GitHub repo transfer is viable, use it — GitHub maintains git-level redirects for clones and fetches indefinitely

## Redirect Strategy

**What GitHub handles automatically (via repo transfer):**
- `git clone` / `git fetch` / `git push` URLs redirect permanently
- Web URLs redirect (issues, PRs, file permalinks)
- GitHub API calls redirect

**What you must handle manually:**
- Marketplace manifests (`.claude-plugin/`, `.cursor-plugin/`)
- CI configs that hardcode the repo path
- Pinned messages in community channels with old URLs
- PatternFly website/docs references

## Bridge Period

During Phase 1, both repos accept contributions. Maintainers merge PRs in the old repo, then cherry-pick into the new repo. This is manual and does not scale, but for a 2-week bridge with this repo's volume, it is sufficient. Do not build automation for a temporary problem.

## Rollback Criteria

**Triggers (any one):**
- CI in the combined repo cannot be made green within Phase 1
- Contributor PRs are lost or misrouted during the bridge period
- Marketplace installs from the new repo fail for Claude or Cursor
- A blocking issue with the `plugins/patternfly/<name>/` path structure cannot be resolved

**Procedure:**
- Unarchive `patternfly/ai-helpers`
- Remove the redirect banner
- Communicate on the same channels used for the migration announcement
- Revisit the merge when the blocking issue is resolved

Rollback means the timeline was wrong, not the decision.

## Communication Plan

**Where to announce (in order):**
1. Pinned GitHub Discussion or Issue on `patternfly/ai-helpers` with the full timeline
2. PatternFly community channels (Slack/Discord) — short message linking to the pinned issue
3. README banner on the old repo (added in Phase 1)
4. Release notes in both repos

**When:**
- 1 week before Phase 1 begins
- When Phase 1 starts
- When Phase 2 (soft cutover) starts
- When the old repo is archived

**Announcements include:** why (one sentence), the before/after table, timeline with dates, link to this document, contact for questions.

## Open PR Triage

Before Phase 1, audit every open PR and issue on `patternfly/ai-helpers`:
- If mergeable before Phase 1 — merge it
- If stale — close with explanation
- If active — comment with the plan and offer to help re-target

## Post-Migration Checklist

- [ ] `git clone <old-url>` redirects to new repo (if transfer used)
- [ ] All marketplace installs work from the new repo
- [ ] CI is green on the new repo's main branch
- [ ] All 9 plugins and 40 skills are functional
- [ ] No open issues reference paths that no longer exist
- [ ] Old repo README points to new location
- [ ] Search engines index the new repo (verify after 2-4 weeks)
- [ ] All internal documentation references updated
