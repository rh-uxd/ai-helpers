# Pipeline Mode (Speedrun)

End-to-end orchestration: create → evaluate → optional refine → publish.

## When to use

User asks for a full pipeline, "speedrun", "create and evaluate and publish", or passes `--pipeline` / `--speedrun`.

Create itself performs source checks and ends at the user handoff. A pipeline
request selects an intended sequence, not blanket browser/provider/edit/publishing
consent. Review each selected stage and Full's continuation checkpoint separately;
do not add a browser smoke test inside Create.

## Onboarding extras (pipeline only)

After normal create questions, also ask:

1. **Publish target** — `repo` (MR/PR), `github` (GitHub Pages), `gitlab`, `vercel`, `none` (stop after eval), **or a git URL** (open an MR/PR against that repo; implies `repo`)
2. **Evaluation goal/scope** — recommend selected Quick Checks, independent task/persona Walkthroughs or checkpointed Full. A live URL is needed only for selected browser work, not source-only checks.
3. **Selected fixes?** — default no; review evidence-backed actions, allowed files and one post-fix verification before editing. No automatic three-cycle loop.

## Sequence

```
1. CREATE    → follow uxd-prototype-create Steps 1–13
               (Prototype Bar on by default; optional --export after serve URL is known)
1b. BAR      → install-prototype-bar.sh --artifacts (ALWAYS unless --no-prototype-bar)
               Syncs prototype-bar.json from metadata + installs assets into source.
               Commit source-affecting bar changes BEFORE evaluation; no late reinstall.
2. SERVE?    → only for selected browser/export work; verify the served revision
2b. EXPORT?  → if --export, run Step 12 (journey static HTML / tree under artifacts/{ID}/exports)
3. EVALUATE  → uxd-evaluator prepares the reviewed packet and selected route.
               uxd-prototype-evaluate runs only selected Quick Checks or Full;
               Full saves a review checkpoint before separately approved Walkthroughs.
               Read validated canonical JSON, including NOT_RUN and blocked coverage.
3b. REPORT?  → only with report/sharing approval; follow Publish Step 2a.
               Do not pre-copy HTML or refresh source after the evaluated revision.
4. REFINE?   → review selected evidence-backed actions and approve exact edits;
               preserve the parent run; verify the changed revision once, then stop.
5. PUBLISH?  → /uxd-prototype-publish {ID} --target={target}
               --eval-run <selected-canonical-run>  (if target ≠ none and approved)
               When target was a git URL, pass --target=<url> (or --target=repo with
               upstream already set / submit_to_repo.py --upstream <url>)
               For workspace repo reports, add --include-eval-report; submission
               validates clean source, then renders/attaches the selected report.
```

Persist flags to `artifacts/{ID}/pipeline-config.yaml` so the run survives context compression:

```yaml
pipeline:
  id: PROJ-298
  workspace: https://gitlab.example.com/user/fork.git
  workspace_branch: main          # optional; clone branch for --workspace
  decisions: skip
  # depth: normal          # optional explicit exploration effort, not a count
  url: http://localhost:3000
  target: repo
  target_repo_url: https://gitlab.example.com/org/canonical.git
  target_branch: release-2.22     # optional; MR/PR base on --target
  max_refine_cycles: 3            # legacy ceiling; never overrides one approved split verification
  dry_run: false
  prototype_bar: true
  export: false
  export_formats: html,pf-spec
```

When `--target` is a git URL, normalize `target` to `repo` and store the URL in `target_repo_url`. Pass that URL to `resolve_workspace.py --upstream` during create and to `submit_to_repo.py --upstream` during publish. Persist `workspace_branch` / `target_branch` when set and pass them as `--workspace-branch` / `--target-branch`.

## Defaults

| Flag | Default |
|------|---------|
| `--decisions` | `skip` |
| `--depth` | `normal` exploration effort; no count quota or onboarding question (ignored with `skip`) |
| `--target` | `none` |
| `--max-refine-cycles` | `3` (legacy ceiling; split evaluation still stops after one approved verification) |
| `--headless` | off |
| `--prototype-bar` | on |
| `--export` | off |

## Evaluate contract

- Use a reviewed source snapshot, exact prototype revision, selected checks and
  fresh output path. Follow the [split execution contract](../../uxd-prototype-evaluate/references/workflow/split-evaluation.md),
  not the retired positional invocation or CSV gate.
- From the evaluator directory, execute the selected route with
  `node scripts/run-split-evaluation.js --route quick --input <packet.json>
  --output <fresh-run-directory> --checks <selected-checks>`; choose `full`
  instead only for the reviewed checkpointed composition. Walkthroughs are also
  independently callable; no implicit persona cohort is added.
- Validate `pe-context.json`, `pe-evaluation-snapshot.json`, `pe-evidence.json`, `pe-actions.json` and
  `pe-state.json` plus linked receipts before decisions. Source-only checks do not
  probe a server; selected browser work needs separate authorization and a
  verified served revision. A classification-only run leaves ACs unverified.
- Preserve Full's awaiting-review checkpoint and separate edit approval. Initial
  evaluation is pass 1; selected post-fix verification is pass 2; stop afterward.
- Publishing uses a completed, revision/scope-matching selected run. Nonempty
  explicit verified PASS coverage may be labeled `eval-pass`; zero FAIL alone
  cannot qualify when ACs are FLAGGED/NOT_RUN or absent. Surface those limits.
  FAIL blocks submission unless explicitly overridden with `--force`; invalid or
  stale canonical inputs must be corrected, not overridden or replaced with CSV.

## Repo submit notes

When `--target=repo` or `--target` is a git URL, publish uses `submit_to_repo.py` (fork-aware `glab mr create`, MR verification, optional Pages polling). Run git push / submit scripts with elevated permissions (`required_permissions: ["all"]` in Cursor).

**Fork demo pattern:**

```
--workspace https://gitlab.example.com/user/fork.git \
--workspace-branch main \
--target https://gitlab.example.com/org/canonical.git \
--target-branch release-2.22
```

`--workspace` is cloned as `origin` (push destination); `--workspace-branch` selects the clone ref. `--target` URL becomes `upstream` (MR base repo); `--target-branch` is the MR merge base. Same project path on both → same-repo workflow.

## Batch

If multiple IDs are provided, run the sequence per ID. Write a brief batch summary table at the end (ID, FAIL count, publish URL).
