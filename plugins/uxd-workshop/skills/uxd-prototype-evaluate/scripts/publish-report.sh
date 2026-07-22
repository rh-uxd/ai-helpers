#!/usr/bin/env bash
set -euo pipefail

# Publish an evaluation report to GitLab Pages (or a reports branch as fallback).
# Overwrites the report at the same URL if re-run for the same prototype.
#
# Usage:
#   bash ${CLAUDE_SKILL_DIR}/scripts/publish-report.sh .artifacts/PROJ-298/
#   bash ${CLAUDE_SKILL_DIR}/scripts/publish-report.sh .artifacts/PROJ-298/ --mode=branch

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/publish.yaml"
INDEX_TEMPLATE="$PROJECT_ROOT/templates/report-index.html"

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
  echo "Usage: publish-report.sh <artifacts-dir> [--mode=pages|branch]" >&2
  echo "  e.g. publish-report.sh .artifacts/PROJ-298/" >&2
  exit 1
fi

ARTIFACTS_DIR="$(cd "$ARTIFACTS_DIR" && pwd)"
REPORT_FILE="$ARTIFACTS_DIR/evaluation-report.html"

if [[ ! -f "$REPORT_FILE" ]]; then
  echo "Error: No evaluation-report.html found in $ARTIFACTS_DIR" >&2
  exit 1
fi

# ── Read config ──────────────────────────────────────────────────────────────

read_yaml_value() {
  local key="$1"
  grep "^${key}:" "$CONFIG_FILE" 2>/dev/null | sed 's/^[^:]*: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' || echo ""
}

GITLAB_PAGES_REPO="${GITLAB_PAGES_REPO:-$(read_yaml_value gitlab_pages_repo)}"
PAGES_BASE_URL="${PAGES_BASE_URL:-$(read_yaml_value pages_base_url)}"
PAGES_BRANCH="${PAGES_BRANCH:-$(read_yaml_value pages_branch)}"
REPORTS_DIR="${REPORTS_DIR:-$(read_yaml_value reports_dir)}"
JIRA_BASE_URL="${JIRA_BASE_URL:-$(read_yaml_value jira_base_url)}"
DEFAULT_MODE="$(read_yaml_value default_mode)"
BRANCH_REMOTE="$(read_yaml_value branch_remote)"
BRANCH_NAME="$(read_yaml_value branch_name)"
GIT_USER_NAME="${GIT_USER_NAME:-$(read_yaml_value git_user_name)}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-$(read_yaml_value git_user_email)}"

MODE="${MODE:-$DEFAULT_MODE}"

# Extract prototype key from directory name (e.g., PROJ-298)
PROTO_KEY="$(basename "$ARTIFACTS_DIR")"

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
  local RDIR="${REPORTS_DIR:-public/evals}"

  # Shallow clone the target branch
  git clone --depth 1 --branch "$BRANCH" "$GITLAB_PAGES_REPO" "$WORK_DIR/pages-repo" 2>/dev/null

  local REPORTS_PATH="$WORK_DIR/pages-repo/$RDIR"
  mkdir -p "$REPORTS_PATH/$PROTO_KEY"

  # Copy report as index.html (clean URLs)
  cp "$REPORT_FILE" "$REPORTS_PATH/$PROTO_KEY/index.html"

  # Copy data files for dashboard index generation
  [[ -f "$ARTIFACTS_DIR/evaluation-report.csv" ]] && cp "$ARTIFACTS_DIR/evaluation-report.csv" "$REPORTS_PATH/$PROTO_KEY/"
  [[ -f "$ARTIFACTS_DIR/journey-log.json" ]] && cp "$ARTIFACTS_DIR/journey-log.json" "$REPORTS_PATH/$PROTO_KEY/"

  # Write metadata.json with MR/repo info if available from extract state
  local EXTRACT_STATE="$ARTIFACTS_DIR/extract-state.json"
  if [[ -f "$EXTRACT_STATE" ]]; then
    cp "$EXTRACT_STATE" "$REPORTS_PATH/$PROTO_KEY/extract-state.json"
  fi
  # Generate metadata from environment or extract-state
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs = require('fs');
      const path = require('path');
      const dir = '$REPORTS_PATH/$PROTO_KEY';
      const meta = {};
      const es = path.join(dir, 'extract-state.json');
      if (fs.existsSync(es)) {
        const d = JSON.parse(fs.readFileSync(es, 'utf8'));
        if (d.ticket_summary || d.story_title || d.title) meta.title = d.ticket_summary || d.story_title || d.title;
        if (d.mr_url || d.merge_request_url) meta.mrUrl = d.mr_url || d.merge_request_url;
        if (d.repo_url || d.repository_url) meta.repoUrl = d.repo_url || d.repository_url;
        if (d.branch) meta.branch = d.branch;
      }
      if (Object.keys(meta).length > 0) {
        fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
      }
    " 2>/dev/null || true
  fi

  # Copy iteration snapshot reports as subdirectories
  local ARTIFACTS_DIR
  ARTIFACTS_DIR="$(dirname "$REPORT_FILE")"
  for iter_html in "$ARTIFACTS_DIR"/evaluation-report-iter-*.html; do
    [ -f "$iter_html" ] || continue
    local iter_num
    iter_num="$(echo "$iter_html" | grep -o 'iter-[0-9]*' | grep -o '[0-9]*')"
    if [ -n "$iter_num" ]; then
      mkdir -p "$REPORTS_PATH/$PROTO_KEY/iter-$iter_num"
      cp "$iter_html" "$REPORTS_PATH/$PROTO_KEY/iter-$iter_num/index.html"
    fi
  done

  # Copy original report (first iteration, full version)
  if [ -f "$ARTIFACTS_DIR/evaluation-report-original.html" ]; then
    mkdir -p "$REPORTS_PATH/$PROTO_KEY/original"
    cp "$ARTIFACTS_DIR/evaluation-report-original.html" "$REPORTS_PATH/$PROTO_KEY/original/index.html"
  fi

  # Regenerate the data.json for the React dashboard
  if [[ -f "$WORK_DIR/pages-repo/scripts/generate-data.cjs" ]]; then
    node "$WORK_DIR/pages-repo/scripts/generate-data.cjs" "$REPORTS_PATH"
  else
    node "$(dirname "$0")/generate-dashboard.js" "$REPORTS_PATH"
  fi

  # Copy leaderboard if it exists (sibling to index.html for navigation)
  local LEADERBOARD="$ARTIFACTS_DIR/../pain-leaderboard.html"
  [[ -f "$LEADERBOARD" ]] && cp "$LEADERBOARD" "$REPORTS_PATH/pain-leaderboard.html"

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

  local REPORT_URL="${PAGES_BASE_URL}/evals/${PROTO_KEY}/"
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
  mkdir -p "evals/$PROTO_KEY"
  cp "$REPORT_FILE" "evals/$PROTO_KEY/index.html"

  # Regenerate index
  node "$(dirname "$0")/generate-dashboard.js" "$BRANCH_DIR/evals"

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
  local RAW_URL="${GITLAB_PAGES_REPO%.git}/-/raw/${BRANCH}/evals/${PROTO_KEY}/index.html"
  # Convert SSH URL to HTTPS for raw access
  RAW_URL="$(echo "$RAW_URL" | sed 's|git@\([^:]*\):|https://\1/|')"
  echo "$RAW_URL" > "$ARTIFACTS_DIR/report-url.txt"
  echo "$RAW_URL"
}

# ── Index page generation ────────────────────────────────────────────────────

generate_index() {
  local EVALS_DIR="$1"
  local INDEX_FILE="$EVALS_DIR/index.html"
  local ROWS_FILE STATS_FILE
  ROWS_FILE="$(mktemp)"
  STATS_FILE="$(mktemp)"

  local total_evals=0
  local total_pass=0
  local usability_sum=0
  local usability_count=0

  for report_dir in "$EVALS_DIR"/*/; do
    [[ -f "$report_dir/index.html" ]] || continue
    local key
    key="$(basename "$report_dir")"
    [[ "$key" == "." || "$key" == ".." ]] && continue

    total_evals=$((total_evals + 1))

    local eval_date
    eval_date="$(date -r "$report_dir/index.html" +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)"

    local title=""
    title="$(grep -o '<title>[^<]*</title>' "$report_dir/index.html" 2>/dev/null | head -1 | sed 's/<[^>]*>//g' || echo "")"
    [[ -z "$title" ]] && title="$key"

    local ac_result="—" ac_display="" usability="—" usability_class=""
    local csv_file="$report_dir/evaluation-report.csv"
    if [[ -f "$csv_file" ]]; then
      local p f fl
      p=$(grep -c ',PASS,' "$csv_file" 2>/dev/null || echo 0)
      f=$(grep -c ',FAIL,' "$csv_file" 2>/dev/null || echo 0)
      fl=$(grep -c ',FLAGGED,' "$csv_file" 2>/dev/null || echo 0)
      local total_ac=$((p + f + fl))
      ac_result="${p}/${total_ac}"
      if [[ "$f" -eq 0 ]]; then
        ac_display="<span class=\"badge badge-pass\">Pass</span> ${ac_result}"
        total_pass=$((total_pass + 1))
      elif [[ "$fl" -gt 0 ]]; then
        ac_display="<span class=\"badge badge-mixed\">Mixed</span> ${ac_result}"
      else
        ac_display="<span class=\"badge badge-fail\">Fail</span> ${ac_result}"
      fi
    fi

    local jl_file="$report_dir/journey-log.json"
    if [[ -f "$jl_file" ]]; then
      local score
      score=$(grep -o '"overall_score"[[:space:]]*:[[:space:]]*"[^"]*"' "$jl_file" 2>/dev/null | head -1 | sed 's/.*: *"//;s/".*//')
      if [[ -z "$score" ]]; then
        score=$(grep -o '"overall_score"[[:space:]]*:[[:space:]]*[0-9.]*' "$jl_file" 2>/dev/null | head -1 | sed 's/.*: *//')
      fi
      if [[ -n "$score" ]]; then
        usability="$score"
        local num_score
        num_score=$(echo "$score" | sed 's|/21||')
        if command -v bc >/dev/null 2>&1; then
          if [[ $(echo "$num_score >= 15" | bc 2>/dev/null) == "1" ]]; then usability_class="score-good"
          elif [[ $(echo "$num_score >= 10" | bc 2>/dev/null) == "1" ]]; then usability_class="score-ok"
          else usability_class="score-low"; fi
          usability_sum=$(echo "$usability_sum + $num_score" | bc)
          usability_count=$((usability_count + 1))
        fi
      fi
    fi

    echo "<tr><td><a href=\"${key}/\">${key}</a></td><td>${title}</td><td>${ac_display}</td><td><span class=\"score ${usability_class}\">${usability}</span></td><td class=\"date-cell\">${eval_date}</td><td><a href=\"${JIRA_BASE_URL}/${key}\" target=\"_blank\">Jira</a></td></tr>" >> "$ROWS_FILE"
  done

  local avg_usability="—"
  if [[ "$usability_count" -gt 0 ]] && command -v bc >/dev/null 2>&1; then
    avg_usability="$(echo "scale=1; $usability_sum / $usability_count" | bc)/21"
  fi
  local pass_rate="—"
  if [[ "$total_evals" -gt 0 ]]; then
    pass_rate="$((total_pass * 100 / total_evals))%"
  fi

  cat > "$STATS_FILE" <<STATSEOF
<div class="stat-card"><div class="stat-value">${total_evals}</div><div class="stat-label">Total Evals</div></div>
<div class="stat-card"><div class="stat-value">${pass_rate}</div><div class="stat-label">Pass Rate</div></div>
<div class="stat-card"><div class="stat-value">${avg_usability}</div><div class="stat-label">Avg Usability</div></div>
<div class="stat-card"><div class="stat-value">${total_pass}/${total_evals}</div><div class="stat-label">All AC Pass</div></div>
STATSEOF

  if [[ -f "$INDEX_TEMPLATE" ]]; then
    sed "s|{{STATS_CARDS}}|$(cat "$STATS_FILE")|" "$INDEX_TEMPLATE" | sed "/{{REPORT_ROWS}}/r $ROWS_FILE" | sed '/{{REPORT_ROWS}}/d' > "$INDEX_FILE"
  else
    cat > "$INDEX_FILE" <<'INDEXEOF'
<!DOCTYPE html><html><head><title>Evaluation Reports</title></head><body>
<h1>Evaluation Reports</h1><table><thead><tr><th>Key</th><th>Title</th><th>Result</th><th>Usability</th><th>Date</th><th>Jira</th></tr></thead><tbody>
INDEXEOF
    cat "$ROWS_FILE" >> "$INDEX_FILE"
    echo "</tbody></table></body></html>" >> "$INDEX_FILE"
  fi

  rm -f "$ROWS_FILE" "$STATS_FILE"
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
    eval_url="${PAGES_BASE_URL%/}/evals/${PROTO_KEY}/"
  fi
  if [[ -z "$eval_url" ]]; then
    eval_url="/evals/${PROTO_KEY}/"
  fi

  local jira_base="${JIRA_BASE_URL:-https://issues.redhat.com/browse/}"
  node "$export_sync" \
    --artifacts "$ARTIFACTS_DIR" \
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
