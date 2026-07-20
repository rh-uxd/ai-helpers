# Pipeline Mode (Speedrun)

End-to-end orchestration: create → evaluate → optional refine → publish.

## When to use

User asks for a full pipeline, "speedrun", "create and evaluate and publish", or passes `--pipeline` / `--speedrun`.

## Onboarding extras (pipeline only)

After normal create questions, also ask:

1. **Publish target** — `repo` (MR), `public` (GitHub Pages), `gitlab`, `vercel`, or `none` (stop after eval)
2. **Prototype URL for evaluate** — required once the app can be served (workspace: usual `npm start` URL; standalone: serve the HTML folder)
3. **Auto-refine?** — yes/no (default yes, max 3 cycles)

## Sequence

```
1. CREATE    → follow uxd-prototype-create Steps 1–12
2. SERVE     → ensure prototype is reachable at {URL}
3. EVALUATE  → /uxd-prototype-evaluate {ID} {URL} [--workspace=…]
4. REFINE?   → if evaluation-report.csv has FAIL → refine (this skill) → re-eval
               skip when FAIL count is 0
5. PUBLISH?  → /uxd-prototype-publish {ID} --target={target}  (if target ≠ none)
```

Persist flags to `.artifacts/{ID}/pipeline-config.yaml` so the run survives context compression:

```yaml
pipeline:
  id: PROJ-298
  workspace: /path/or/standalone
  mode: auto
  depth: normal
  url: http://localhost:3000
  target: repo
  max_refine_cycles: 3
  dry_run: false
```

## Defaults

| Flag | Default |
|------|---------|
| `--mode` | `auto` |
| `--depth` | `normal` |
| `--target` | `none` |
| `--max-refine-cycles` | `3` |
| `--headless` | off |

## Evaluate contract

- Evaluate needs a **live URL** — do not claim "quick rubric" scoring.
- Pass for continuing to publish without `--force`: zero FAIL in `.artifacts/{ID}/evaluation-report.csv`.
- FLAGGED criteria: surface to the user; do not auto-block publish unless the user wants a clean report.

## Repo submit notes

When `--target=repo`, publish uses `submit_to_repo.py` (fork-aware `glab mr create`, MR verification, optional Pages polling). Run git push / submit scripts with elevated permissions (`required_permissions: ["all"]` in Cursor).

## Batch

If multiple IDs are provided, run the sequence per ID. Write a brief batch summary table at the end (ID, FAIL count, publish URL).
