# Pipeline Mode (Speedrun)

End-to-end orchestration: create → evaluate → optional refine → publish.

## When to use

User asks for a full pipeline, "speedrun", "create and evaluate and publish", or passes `--pipeline` / `--speedrun`.

## Onboarding extras (pipeline only)

After normal create questions, also ask:

1. **Publish target** — `repo` (MR/PR), `github` (GitHub Pages), `gitlab`, `vercel`, `none` (stop after eval), **or a git URL** (open an MR/PR against that repo; implies `repo`)
2. **Prototype URL for evaluate** — required once the app can be served (workspace: usual `npm start` URL; standalone: serve the HTML folder)
3. **Auto-refine?** — yes/no (default yes, max 3 cycles)

## Sequence

```
1. CREATE    → follow uxd-prototype-create Steps 1–13
               (Prototype Bar on by default; optional --export after serve URL is known)
1b. BAR      → install-and-sync-prototype-bar.sh (ALWAYS unless --no-prototype-bar)
               Syncs prototype-bar.json from metadata + installs assets into source.
               Must run BEFORE serve so the bar is visible immediately.
2. SERVE     → ensure prototype is reachable at {URL}
2b. EXPORT?  → if --export, run Step 11 (journey static HTML / tree under .artifacts/{ID}/exports)
3. EVALUATE  → /uxd-prototype-evaluate {ID} {URL} [--workspace=…]
3b. BAR (refresh) → re-run install-and-sync-prototype-bar.sh after evaluate.
               This re-syncs the config AND copies the eval report into
               public/evals/{ID}/ so the Eval tab works on Pages.
               (Happens automatically — Step 3 in the unified script detects the report.)
4. REFINE?   → if .artifacts/{ID}/eval/evaluation-report.csv has FAIL → refine (this skill) → re-eval
               skip when FAIL count is 0
5. PUBLISH?  → /uxd-prototype-publish {ID} --target={target}  (if target ≠ none)
               When target was a git URL, pass --target=<url> (or --target=repo with
               upstream already set / submit_to_repo.py --upstream <url>)
```

Persist flags to `.artifacts/{ID}/pipeline-config.yaml` so the run survives context compression:

```yaml
pipeline:
  id: PROJ-298
  workspace: https://gitlab.example.com/user/fork.git
  decisions: skip
  # depth: normal          # only when decisions is auto or human
  url: http://localhost:3000
  target: repo
  target_repo_url: https://gitlab.example.com/org/canonical.git
  max_refine_cycles: 3
  dry_run: false
  prototype_bar: true
  export: false
  export_formats: html,pf-spec
```

When `--target` is a git URL, normalize `target` to `repo` and store the URL in `target_repo_url`. Pass that URL to `resolve_workspace.py --upstream` during create and to `submit_to_repo.py --upstream` during publish.

## Defaults

| Flag | Default |
|------|---------|
| `--decisions` | `skip` |
| `--depth` | `normal` (ignored when `--decisions=skip`) |
| `--target` | `none` |
| `--max-refine-cycles` | `3` |
| `--headless` | off |
| `--prototype-bar` | on |
| `--export` | off |

## Evaluate contract

- Evaluate needs a **live URL** — do not claim "quick rubric" scoring.
- Pass for continuing to publish without `--force`: zero FAIL in `.artifacts/{ID}/eval/evaluation-report.csv`.
- FLAGGED criteria: surface to the user; do not auto-block publish unless the user wants a clean report.

## Repo submit notes

When `--target=repo` or `--target` is a git URL, publish uses `submit_to_repo.py` (fork-aware `glab mr create`, MR verification, optional Pages polling). Run git push / submit scripts with elevated permissions (`required_permissions: ["all"]` in Cursor).

**Fork demo pattern:**

```
--workspace https://gitlab.example.com/user/fork.git \
--target https://gitlab.example.com/org/canonical.git
```

`--workspace` is cloned as `origin` (push destination). `--target` URL becomes `upstream` (MR base). Same project path on both → same-repo workflow.

## Batch

If multiple IDs are provided, run the sequence per ID. Write a brief batch summary table at the end (ID, FAIL count, publish URL).
