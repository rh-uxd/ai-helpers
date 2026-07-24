#!/usr/bin/env bash
#
# Publishes a sanitized copy of the prototype to a GitLab repository with
# GitLab Pages enabled. Supports both gitlab.com and self-hosted instances.
# Creates a temporary staging directory, removes sensitive files, adds a
# .gitlab-ci.yml for Pages, and force-pushes.
#
# Usage:
#   bash publish-gitlab-pages.sh --project namespace/project
#                                [--gitlab-url https://gitlab.example.com]
#                                [--source /path/to/repo]
#                                [--no-ssl-verify]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/../templates"

# --- Defaults ---
GITLAB_PROJECT=""
GITLAB_URL="https://gitlab.com"
SOURCE_DIR="$(pwd)"
NO_SSL_VERIFY="false"

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)       GITLAB_PROJECT="$2"; shift 2 ;;
    --gitlab-url)    GITLAB_URL="$2"; shift 2 ;;
    --source)        SOURCE_DIR="$2"; shift 2 ;;
    --no-ssl-verify) NO_SSL_VERIFY="true"; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ -z "$GITLAB_PROJECT" ]]; then
  echo "Error: --project is required (e.g., --project my-group/ux-prototype)"
  exit 1
fi

# Strip trailing slash from GitLab URL
GITLAB_URL="${GITLAB_URL%/}"

# --- Derive remote URL and project components ---
REPO_NAME=$(echo "$GITLAB_PROJECT" | sed 's|.*/||')
NAMESPACE=$(echo "$GITLAB_PROJECT" | sed "s|/${REPO_NAME}$||")

if [[ "$GITLAB_PROJECT" == https://* ]]; then
  REMOTE_URL="$GITLAB_PROJECT"
  [[ "$REMOTE_URL" != *.git ]] && REMOTE_URL="${REMOTE_URL}.git"
  GITLAB_URL=$(echo "$GITLAB_PROJECT" | sed 's|\(https://[^/]*\).*|\1|')
  GITLAB_PROJECT=$(echo "$GITLAB_PROJECT" | sed "s|${GITLAB_URL}/||" | sed 's|\.git$||')
  NAMESPACE=$(echo "$GITLAB_PROJECT" | sed "s|/${REPO_NAME}$||")
else
  REMOTE_URL="${GITLAB_URL}/${GITLAB_PROJECT}.git"
fi

IS_SELFHOSTED="false"
if [[ "$GITLAB_URL" != "https://gitlab.com" ]]; then
  IS_SELFHOSTED="true"
fi

# Configure git SSL if needed
GIT_SSL_OPTS=""
if [[ "$NO_SSL_VERIFY" == "true" ]]; then
  export GIT_SSL_NO_VERIFY=1
  GIT_SSL_OPTS="-c http.sslVerify=false"
fi

echo "============================================"
echo "  Publishing Prototype to GitLab Pages"
echo "============================================"
echo ""
echo "  GitLab URL:  $GITLAB_URL"
echo "  Project:     $GITLAB_PROJECT"
echo "  Namespace:   $NAMESPACE"
echo "  Repo name:   $REPO_NAME"
echo "  Remote URL:  $REMOTE_URL"
echo "  Self-hosted: $IS_SELFHOSTED"
echo "  SSL verify:  $([ "$NO_SSL_VERIFY" == "true" ] && echo "disabled" || echo "enabled")"
echo ""

# --- Step 1: Create temporary staging directory ---
TEMP_DIR=$(mktemp -d)
echo "[1/7] Created temporary staging directory: $TEMP_DIR"

cleanup() {
  if [[ -d "$TEMP_DIR" ]]; then
    echo ""
    echo "[cleanup] Removing temporary directory: $TEMP_DIR"
    rm -rf "$TEMP_DIR"
    echo "[cleanup] Done."
  fi
}
trap cleanup EXIT

# --- Step 2: Copy source files ---
echo "[2/7] Copying source files to staging directory..."
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.server' \
  --exclude='.DS_Store' \
  "$SOURCE_DIR/" "$TEMP_DIR/"
echo "  Done."

# --- Step 3: Remove sensitive files and directories ---
echo "[3/7] Removing sensitive files and directories..."

SENSITIVE_DIRS=(
  ".agents"
  ".artifacts"
  ".cursor"
  ".design"
  ".claude"
  "scripts"
)

SENSITIVE_FILES=(
  "AGENTS.md"
  ".gitlab-ci.yml"
  ".cursormcp"
  ".cursormcp.local"
  ".cursorignore"
  ".cursorindexingignore"
  ".cursor-mcp-config.json"
)

# Keep public/ for webpack/Vite static assets (especially public/evals/ for Prototype Bar).
# Only strip known internal metadata files inside public/.
SENSITIVE_PUBLIC_FILES=(
  "public/fork-descriptions.json"
  "public/forks.json"
)

for dir in "${SENSITIVE_DIRS[@]}"; do
  if [[ -d "$TEMP_DIR/$dir" ]]; then
    rm -rf "$TEMP_DIR/$dir"
    echo "  Removed directory: $dir/"
  fi
done

for file in "${SENSITIVE_FILES[@]}"; do
  if [[ -f "$TEMP_DIR/$file" ]]; then
    rm -f "$TEMP_DIR/$file"
    echo "  Removed file: $file"
  fi
done

for file in "${SENSITIVE_PUBLIC_FILES[@]}"; do
  if [[ -f "$TEMP_DIR/$file" ]]; then
    rm -f "$TEMP_DIR/$file"
    echo "  Removed file: $file"
  fi
done

# Remove GitHub-specific workflows (not needed on GitLab)
rm -rf "$TEMP_DIR/.github"
echo "  Removed directory: .github/ (GitHub-specific)"

for critical in ".agents" ".cursor" ".design" "AGENTS.md"; do
  if [[ -e "$TEMP_DIR/$critical" ]]; then
    echo "FATAL: Failed to remove $critical — aborting to prevent sensitive data leak."
    exit 1
  fi
done
echo "  Verified: all sensitive paths removed."

# --- Step 4: Clean up .gitignore ---
echo "[4/7] Cleaning .gitignore entries..."

if [[ -f "$TEMP_DIR/.gitignore" ]]; then
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i '/^\.env$/d' "$TEMP_DIR/.gitignore"
    sed -i '/^\.env\.local$/d' "$TEMP_DIR/.gitignore"
    sed -i '/^\.env\.server$/d' "$TEMP_DIR/.gitignore"
    sed -i '/\.cursor-mcp-config/d' "$TEMP_DIR/.gitignore"
    sed -i '/\.claude/d' "$TEMP_DIR/.gitignore"
    sed -i '/\.playwright-mcp/d' "$TEMP_DIR/.gitignore"
    sed -i '/\.cursormcp/d' "$TEMP_DIR/.gitignore"
  else
    sed -i '' '/^\.env$/d' "$TEMP_DIR/.gitignore"
    sed -i '' '/^\.env\.local$/d' "$TEMP_DIR/.gitignore"
    sed -i '' '/^\.env\.server$/d' "$TEMP_DIR/.gitignore"
    sed -i '' '/\.cursor-mcp-config/d' "$TEMP_DIR/.gitignore"
    sed -i '' '/\.claude/d' "$TEMP_DIR/.gitignore"
    sed -i '' '/\.playwright-mcp/d' "$TEMP_DIR/.gitignore"
    sed -i '' '/\.cursormcp/d' "$TEMP_DIR/.gitignore"
  fi
fi
echo "  Done."

# --- Step 5: Create GitLab CI pipeline for Pages ---
echo "[5/7] Creating .gitlab-ci.yml for GitLab Pages..."
cp "$TEMPLATE_DIR/gitlab-ci-pages.yml" "$TEMP_DIR/.gitlab-ci.yml"
echo "  Done."

# --- Step 6: Update package.json ---
echo "[6/7] Updating package.json..."

if [[ -f "$TEMP_DIR/package.json" ]]; then
  node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('${TEMP_DIR}/package.json', 'utf8'));
  pkg.repository = '${REMOTE_URL}';
  delete pkg.scripts['predeploy'];
  delete pkg.scripts['deploy'];
  fs.writeFileSync('${TEMP_DIR}/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi
echo "  Done."

# --- Step 7: Git init and force push ---
echo "[7/7] Initializing git and pushing to GitLab..."

cd "$TEMP_DIR"
git init -b main
git add -A
git commit -m "Publish prototype"

git $GIT_SSL_OPTS remote add origin "$REMOTE_URL"
git $GIT_SSL_OPTS push -u origin main --force

echo ""
echo "============================================"
echo "  Published successfully!"
echo "============================================"
echo ""
echo "  Repository: $REMOTE_URL"
echo ""
if [[ "$IS_SELFHOSTED" == "true" ]]; then
  echo "  GitLab Pages URL:"
  echo "  (Depends on your instance's Pages domain config.)"
  echo ""
  echo "  Check your project settings or run:"
  echo "  curl '${GITLAB_URL}/api/v4/projects/<project-id>' \\"
  echo "    --header 'PRIVATE-TOKEN: \$GITLAB_TOKEN' | jq .pages_url"
else
  echo "  GitLab Pages URL (once pipeline completes):"
  echo "  https://${NAMESPACE}.gitlab.io/${REPO_NAME}/"
fi
echo ""
echo "  Next steps:"
echo "  1. Go to the project Settings → Pages to verify"
echo "  2. The CI pipeline will build and deploy automatically"
echo ""
