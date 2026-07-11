#!/usr/bin/env bash
#
# Publishes a sanitized copy of the prototype to Vercel.
# Creates a temporary staging directory, removes sensitive files, and
# deploys via the Vercel CLI.
#
# Usage:
#   bash publish-vercel.sh [--source /path/to/repo] [--project-name name]
#
set -euo pipefail

# --- Prerequisites: Vercel CLI ---
ensure_vercel_cli() {
  if command -v vercel &>/dev/null; then
    echo "[prereq] Vercel CLI is installed: $(vercel --version 2>/dev/null | head -1)"
  else
    echo "[prereq] Vercel CLI not found. Installing globally via npm..."
    npm install -g vercel
    echo "[prereq] Vercel CLI installed: $(vercel --version 2>/dev/null | head -1)"
  fi
}

ensure_vercel_auth() {
  if vercel whoami &>/dev/null 2>&1; then
    echo "[prereq] Vercel CLI is authenticated."
  else
    echo ""
    echo "============================================"
    echo "  Vercel authentication required"
    echo "============================================"
    echo ""
    echo "  You need to sign in to Vercel so we can"
    echo "  deploy the prototype."
    echo ""
    echo "  A browser window will open for you to"
    echo "  sign in. Just follow the prompts."
    echo ""
    vercel login
    echo ""
    echo "[prereq] Authentication successful."
  fi
}

ensure_vercel_cli
ensure_vercel_auth

# --- Defaults ---
SOURCE_DIR="$(pwd)"
PROJECT_NAME=""

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)       SOURCE_DIR="$2"; shift 2 ;;
    --project-name) PROJECT_NAME="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo "============================================"
echo "  Publishing Prototype to Vercel"
echo "============================================"
echo ""
echo "  Source:    $SOURCE_DIR"
if [[ -n "$PROJECT_NAME" ]]; then
  echo "  Project:   $PROJECT_NAME"
fi
echo ""

# --- Step 1: Create temporary staging directory ---
TEMP_DIR=$(mktemp -d)
echo "[1/6] Created temporary staging directory: $TEMP_DIR"

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
echo "[2/6] Copying source files to staging directory..."
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
echo "[3/6] Removing sensitive files and directories..."

SENSITIVE_DIRS=(
  ".agents"
  ".cursor"
  ".design"
  ".claude"
  "scripts"
  "public"
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

for critical in ".agents" ".cursor" ".design" "AGENTS.md" ".gitlab-ci.yml"; do
  if [[ -e "$TEMP_DIR/$critical" ]]; then
    echo "FATAL: Failed to remove $critical — aborting to prevent sensitive data leak."
    exit 1
  fi
done
echo "  Verified: all sensitive paths removed."

# --- Step 4: Clean up .gitignore ---
echo "[4/6] Cleaning .gitignore entries..."

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

# --- Step 5: Remove GitHub-specific workflows (not needed for Vercel) ---
echo "[5/6] Cleaning up GitHub workflows..."
rm -rf "$TEMP_DIR/.github"
echo "  Done."

# --- Step 6: Deploy to Vercel ---
echo "[6/6] Deploying to Vercel..."

cd "$TEMP_DIR"

VERCEL_ARGS=(--prod --yes)
if [[ -n "$PROJECT_NAME" ]]; then
  VERCEL_ARGS+=(--name "$PROJECT_NAME")
fi

DEPLOY_URL=$(vercel "${VERCEL_ARGS[@]}" 2>&1 | tail -1)

echo ""
echo "============================================"
echo "  Published successfully!"
echo "============================================"
echo ""
echo "  Deployment URL: $DEPLOY_URL"
echo ""
