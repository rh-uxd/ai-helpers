#!/usr/bin/env bash
set -euo pipefail

# Publish an evaluation report to GitLab Pages (or a reports branch as fallback).
# Overwrites the report at the same URL if re-run for the same prototype.
#
# Usage:
#   bash ${CLAUDE_SKILL_DIR}/scripts/publish-report.sh artifacts/PROJ-298/prototype-evaluations/full-1/
#   bash ${CLAUDE_SKILL_DIR}/scripts/publish-report.sh artifacts/PROJ-298/prototype-evaluations/full-1/ --mode=branch

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/publish.yaml"

# ── Parse arguments ──────────────────────────────────────────────────────────

ARTIFACTS_DIR=""
MODE=""

for arg in "$@"; do
  case "$arg" in
    --mode=*) MODE="${arg#--mode=}" ;;
    -*) echo "Unknown flag: $arg" >&2; exit 1 ;;
    *) ARTIFACTS_DIR="$arg" ;;
  esac
done

if [[ -z "$ARTIFACTS_DIR" ]]; then
  echo "Usage: publish-report.sh <run-dir> [--mode=pages|branch]" >&2
  echo "  canonical: publish-report.sh artifacts/PROJ-298/prototype-evaluations/full-1/" >&2
  exit 1
fi

ARTIFACTS_DIR="$(cd "$ARTIFACTS_DIR" && pwd)"
REPORT_FILE="$ARTIFACTS_DIR/evaluation-report.html"

if [[ ! -f "$REPORT_FILE" ]]; then
  echo "Error: No evaluation-report.html found in $ARTIFACTS_DIR" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required to validate report publication input." >&2
  exit 1
fi
node "$SCRIPT_DIR/reporting/validate-publish-input.js" "$ARTIFACTS_DIR"

# Find the prototype key, not the individual run name.
KEY_DIR="$ARTIFACTS_DIR"
PROTO_KEY="$(basename "$ARTIFACTS_DIR")"
GLOBAL_EVAL_NAME="prototype-evaluations"
if [[ "$PROTO_KEY" == "eval" ]]; then
  KEY_DIR="$(dirname "$ARTIFACTS_DIR")"
  PROTO_KEY="$(basename "$KEY_DIR")"
elif [[ "$(basename "$(dirname "$ARTIFACTS_DIR")")" == "prototype-evaluations" || "$(basename "$(dirname "$ARTIFACTS_DIR")")" == "evaluation" ]]; then
  KEY_DIR="$(dirname "$(dirname "$ARTIFACTS_DIR")")"
  PROTO_KEY="$(basename "$KEY_DIR")"
fi

# Embed Prototype Bar into a published eval HTML (best-effort)
inject_prototype_bar() {
  local html_path="$1"
  local inject="$SCRIPT_DIR/../../uxd-prototype-export/scripts/inject-prototype-bar-into-html.mjs"
  [[ -f "$html_path" && -f "$inject" ]] || return 0
  command -v node >/dev/null 2>&1 || return 0
  # Keep this copy's navigation on the configured report route without changing
  # the designer's existing config before publication has succeeded.
  local report_config="$WORK_DIR/report-bar.json"
  node - "$KEY_DIR/prototype-bar.json" "$report_config" "$PROTO_KEY" "/$REPORTS_ROUTE/$PROTO_KEY/" <<'NODE'
const fs = require('fs');
const [source, output, id, url] = process.argv.slice(2);
let config = {};
try {
  const saved = JSON.parse(fs.readFileSync(source, 'utf8'));
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) config = saved;
} catch {}
fs.writeFileSync(output, JSON.stringify({ ...config, id, views: { ...config.views, eval: url } }));
NODE
  node "$inject" --html "$html_path" --artifacts "$KEY_DIR" --config "$report_config" --view eval 2>/dev/null || true
}

# Keep the cross-key index beside the project key folders, not inside a run.
EVAL_GLOBAL_DIR="$(cd "$(dirname "$KEY_DIR")" && mkdir -p "$GLOBAL_EVAL_NAME" && cd "$GLOBAL_EVAL_NAME" && pwd)"

# ── Read config ──────────────────────────────────────────────────────────────

read_yaml_value() {
  local key="$1"
  grep "^${key}:" "$CONFIG_FILE" 2>/dev/null | sed 's/^[^:]*: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' || echo ""
}

GITLAB_PAGES_REPO="${GITLAB_PAGES_REPO:-$(read_yaml_value gitlab_pages_repo)}"
PAGES_BASE_URL="${PAGES_BASE_URL:-$(read_yaml_value pages_base_url)}"
PAGES_BRANCH="${PAGES_BRANCH:-$(read_yaml_value pages_branch)}"
REPORTS_DIR="${REPORTS_DIR:-$(read_yaml_value reports_dir)}"
REPORTS_DIR="${REPORTS_DIR:-public/prototype-evaluations}"
# Pages serves public/ as its root. Derive URLs and branch-mode paths from the
# same setting, so changing reports_dir cannot leave links pointing at /evals/.
REPORTS_ROUTE="${REPORTS_DIR#public/}"
if [[ ! "$REPORTS_DIR" =~ ^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ || "/$REPORTS_DIR/" == *"/../"* || "/$REPORTS_DIR/" == *"/./"* || "$REPORTS_ROUTE" == "public" ]]; then
  echo "Error: reports_dir must be a relative report directory such as public/prototype-evaluations" >&2
  exit 1
fi
JIRA_BASE_URL="${JIRA_BASE_URL:-$(read_yaml_value jira_base_url)}"
DEFAULT_MODE="$(read_yaml_value default_mode)"
BRANCH_REMOTE="$(read_yaml_value branch_remote)"
BRANCH_NAME="$(read_yaml_value branch_name)"
GIT_USER_NAME="${GIT_USER_NAME:-$(read_yaml_value git_user_name)}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-$(read_yaml_value git_user_email)}"

MODE="${MODE:-$DEFAULT_MODE}"

# ── Temp workspace ───────────────────────────────────────────────────────────

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# ── Mode: GitLab Pages ───────────────────────────────────────────────────────

publish_pages() {
  echo "Publishing to GitLab Pages..."

  if [[ -z "$GITLAB_PAGES_REPO" ]]; then
    echo "Error: Pages repo not configured (set GITLAB_PAGES_REPO env var or config/publish.yaml)" >&2
    exit 1
  fi

  local BRANCH="${PAGES_BRANCH:-main}"
  local RDIR="$REPORTS_DIR"

  # Shallow clone the target branch
  git clone --depth 1 --branch "$BRANCH" "$GITLAB_PAGES_REPO" "$WORK_DIR/pages-repo" 2>/dev/null

  local REPORTS_PATH="$WORK_DIR/pages-repo/$RDIR"
  mkdir -p "$REPORTS_PATH/$PROTO_KEY"

  # Copy report as index.html (clean URLs)
  cp "$REPORT_FILE" "$REPORTS_PATH/$PROTO_KEY/index.html"
  inject_prototype_bar "$REPORTS_PATH/$PROTO_KEY/index.html"

  # Canonical HTML is self-contained. Publish only that derived report and
  # rebuild the link index, never old CSV/journey projections or private inputs.
  node "$(dirname "$0")/reporting/generate-dashboard.js" "$REPORTS_PATH"

  # Copy leaderboard if it exists (sibling to index.html for navigation)
  local LEADERBOARD="${EVAL_GLOBAL_DIR:+$EVAL_GLOBAL_DIR/pain-leaderboard.html}"
  [[ -n "$LEADERBOARD" && -f "$LEADERBOARD" ]] && cp "$LEADERBOARD" "$REPORTS_PATH/pain-leaderboard.html"

  # Commit and push
  cd "$WORK_DIR/pages-repo"
  git add -A
  if git diff --cached --quiet; then
    echo "No changes to publish (report unchanged)."
  else
    git \
      -c user.name="${GIT_USER_NAME:-Evan Jaquez}" \
      -c user.email="${GIT_USER_EMAIL:-eval-bot@example.com}" \
      commit -m "Update eval report: $PROTO_KEY ($(date +%Y-%m-%d))"
    git push origin "$BRANCH"
    echo "Published successfully."
  fi

  local REPORT_URL="${PAGES_BASE_URL%/}/${REPORTS_ROUTE}/${PROTO_KEY}/"
  echo "$REPORT_URL" > "$ARTIFACTS_DIR/report-url.txt"
  echo "$REPORT_URL"
}

# ── Mode: Reports branch ────────────────────────────────────────────────────

publish_branch() {
  echo "Publishing to reports branch..."

  local REMOTE="${BRANCH_REMOTE:-origin}"
  local BRANCH="${BRANCH_NAME:-reports}"

  cd "$PROJECT_ROOT"

  # Fetch the branch (create orphan if it doesn't exist)
  git fetch "$REMOTE" "$BRANCH" 2>/dev/null || true

  # Set up worktree for the reports branch
  local BRANCH_DIR="$WORK_DIR/reports-branch"

  if git rev-parse --verify "$REMOTE/$BRANCH" >/dev/null 2>&1; then
    git worktree add "$BRANCH_DIR" "$REMOTE/$BRANCH" 2>/dev/null
  else
    # Create orphan branch
    git worktree add --detach "$BRANCH_DIR" 2>/dev/null
    cd "$BRANCH_DIR"
    git checkout --orphan "$BRANCH"
    git rm -rf . 2>/dev/null || true
    echo "# Evaluation Reports" > README.md
    git add README.md
    git \
      -c user.name="${GIT_USER_NAME:-Evan Jaquez}" \
      -c user.email="${GIT_USER_EMAIL:-eval-bot@example.com}" \
      commit -m "Initialize reports branch"
  fi

  cd "$BRANCH_DIR"
  mkdir -p "$REPORTS_ROUTE/$PROTO_KEY"
  cp "$REPORT_FILE" "$REPORTS_ROUTE/$PROTO_KEY/index.html"
  inject_prototype_bar "$REPORTS_ROUTE/$PROTO_KEY/index.html"

  # Regenerate index
  node "$SCRIPT_DIR/reporting/generate-dashboard.js" "$BRANCH_DIR/$REPORTS_ROUTE"

  git add -A
  if git diff --cached --quiet; then
    echo "No changes to publish (report unchanged)."
  else
    git \
      -c user.name="${GIT_USER_NAME:-Evan Jaquez}" \
      -c user.email="${GIT_USER_EMAIL:-eval-bot@example.com}" \
      commit -m "Update eval report: $PROTO_KEY ($(date +%Y-%m-%d))"
    git push "$REMOTE" HEAD:"$BRANCH"
    echo "Published successfully."
  fi

  # Clean up worktree
  cd "$PROJECT_ROOT"
  git worktree remove "$BRANCH_DIR" 2>/dev/null || true

  # Construct raw file URL (GitLab format)
  local RAW_URL="${GITLAB_PAGES_REPO%.git}/-/raw/${BRANCH}/${REPORTS_ROUTE}/${PROTO_KEY}/index.html"
  # Convert SSH URL to HTTPS for raw access
  RAW_URL="$(echo "$RAW_URL" | sed 's|git@\([^:]*\):|https://\1/|')"
  echo "$RAW_URL" > "$ARTIFACTS_DIR/report-url.txt"
  echo "$RAW_URL"
}

# ── Sync Prototype Bar config (Sources + views.eval) ─────────────────────────

sync_prototype_bar_config() {
  local export_sync="$SCRIPT_DIR/../../uxd-prototype-export/scripts/sync-prototype-bar-config.mjs"
  if [[ ! -f "$export_sync" ]]; then
    echo "Note: sync-prototype-bar-config.mjs not found — skip Prototype Bar update" >&2
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "Note: node not available — skip Prototype Bar update" >&2
    return 0
  fi

  local eval_url=""
  if [[ -f "$ARTIFACTS_DIR/report-url.txt" ]]; then
    eval_url="$(tr -d '[:space:]' < "$ARTIFACTS_DIR/report-url.txt")"
  fi
  if [[ -z "$eval_url" && -n "$PAGES_BASE_URL" ]]; then
    eval_url="${PAGES_BASE_URL%/}/${REPORTS_ROUTE}/${PROTO_KEY}/"
  fi
  if [[ -z "$eval_url" ]]; then
    eval_url="/${REPORTS_ROUTE}/${PROTO_KEY}/"
  fi

  local jira_base="${JIRA_BASE_URL:-$(read_yaml_value jira_base_url)}"
  # prototype-bar.json lives at the key root, not under eval/
  node "$export_sync" \
    --artifacts "$KEY_DIR" \
    --eval-url "$eval_url" \
    --jira-base "$jira_base" || true
}

# ── Dispatch ─────────────────────────────────────────────────────────────────

case "$MODE" in
  pages)  publish_pages ;;
  branch) publish_branch ;;
  *)
    echo "Error: Unknown mode '$MODE'. Use --mode=pages or --mode=branch" >&2
    exit 1
    ;;
esac

sync_prototype_bar_config
