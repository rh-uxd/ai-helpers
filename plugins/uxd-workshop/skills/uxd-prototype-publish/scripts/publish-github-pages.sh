#!/usr/bin/env bash
#
# Publishes a sanitized copy of the prototype to a public GitHub repository.
# Creates a temporary staging directory, removes sensitive files, adds a
# GitHub Pages workflow, and force-pushes.
#
# Usage:
#   bash publish.sh --repo owner/repo [--source /path/to/repo]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/../templates"

# --- Prerequisites: gh CLI ---
ensure_gh_cli() {
  if command -v gh &>/dev/null; then
    echo "[prereq] gh CLI is installed: $(gh --version | head -1)"
  else
    echo "[prereq] gh CLI not found. Installing via Homebrew..."

    if ! command -v brew &>/dev/null; then
      echo "[prereq] Homebrew not found either. Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

      # Add brew to PATH for Apple Silicon and Intel Macs
      if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
      elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
      fi
    fi

    brew install gh
    echo "[prereq] gh CLI installed: $(gh --version | head -1)"
  fi
}

ensure_gh_auth() {
  if gh auth status &>/dev/null; then
    echo "[prereq] gh CLI is authenticated."
  else
    echo ""
    echo "============================================"
    echo "  GitHub authentication required"
    echo "============================================"
    echo ""
    echo "  You need to sign in to GitHub so we can"
    echo "  push the prototype to your repository."
    echo ""
    echo "  A browser window will open for you to"
    echo "  sign in. Just follow the prompts."
    echo ""
    gh auth login --web --git-protocol https
    echo ""
    echo "[prereq] Authentication successful."
  fi
}

ensure_gh_cli
ensure_gh_auth

# --- Defaults ---
GITHUB_REPO=""
SOURCE_DIR="$(pwd)"

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)   GITHUB_REPO="$2"; shift 2 ;;
    --source) SOURCE_DIR="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ -z "$GITHUB_REPO" ]]; then
  echo "Error: --repo is required (e.g., --repo username/repo-name)"
  exit 1
fi

# --- Derive repo name and remote URL ---
REPO_NAME=$(echo "$GITHUB_REPO" | sed 's|.*/||' | sed 's|\.git$||')

if [[ "$GITHUB_REPO" == https://* ]]; then
  REMOTE_URL="$GITHUB_REPO"
  # Ensure .git suffix
  [[ "$REMOTE_URL" != *.git ]] && REMOTE_URL="${REMOTE_URL}.git"
elif [[ "$GITHUB_REPO" == */* ]]; then
  REMOTE_URL="https://github.com/${GITHUB_REPO}.git"
else
  echo "Error: --repo must be 'owner/repo' or a full GitHub URL"
  exit 1
fi

echo "============================================"
echo "  Publishing Prototype to GitHub Pages"
echo "============================================"
echo ""
echo "  Repository:  $GITHUB_REPO"
echo "  Repo name:   $REPO_NAME"
echo "  Remote URL:  $REMOTE_URL"
echo ""

# --- Step 1: Create temporary staging directory ---
TEMP_DIR=$(mktemp -d)
echo "[1/7] Created temporary staging directory: $TEMP_DIR"

# Ensure cleanup on exit (success or failure)
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

# Verify critical removals
for critical in ".agents" ".cursor" ".design" "AGENTS.md" ".gitlab-ci.yml"; do
  if [[ -e "$TEMP_DIR/$critical" ]]; then
    echo "FATAL: Failed to remove $critical — aborting to prevent sensitive data leak."
    exit 1
  fi
done
echo "  Verified: all sensitive paths removed."

# --- Step 4: Clean up .gitignore ---
echo "[4/7] Cleaning .gitignore entries..."

if [[ -f "$TEMP_DIR/.gitignore" ]]; then
  # macOS-compatible sed (also works on Linux)
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

# --- Step 5: Create GitHub Pages deployment workflow ---
echo "[5/7] Creating GitHub Pages deployment workflow..."
mkdir -p "$TEMP_DIR/.github/workflows"
cp "$TEMPLATE_DIR/github-deploy-pages.yaml" "$TEMP_DIR/.github/workflows/deploy-pages.yaml"
cp "$TEMPLATE_DIR/github-ci.yaml" "$TEMP_DIR/.github/workflows/ci.yaml"
echo "  Done."

# --- Step 6: Update package.json ---
echo "[6/7] Updating package.json..."

if [[ -f "$TEMP_DIR/package.json" ]]; then
  # Derive the owner from the repo path (owner/repo)
  OWNER=$(echo "$GITHUB_REPO" | sed 's|https://github.com/||' | sed 's|\.git$||' | cut -d'/' -f1)

  node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('${TEMP_DIR}/package.json', 'utf8'));
  pkg.homepage = 'https://${OWNER}.github.io/${REPO_NAME}';
  pkg.repository = '${REMOTE_URL}';
  // Remove internal scripts that reference deleted files
  delete pkg.scripts['predeploy'];
  delete pkg.scripts['deploy'];
  fs.writeFileSync('${TEMP_DIR}/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi
echo "  Done."

# --- Step 7: Git init and force push ---
echo "[7/7] Initializing git and pushing to GitHub..."

cd "$TEMP_DIR"
git init -b main
git add -A
git commit -m "Publish prototype"

git remote add origin "$REMOTE_URL"
git push -u origin main --force

echo ""
echo "============================================"
echo "  Published successfully!"
echo "============================================"
echo ""
echo "  Repository: $REMOTE_URL"
echo ""
echo "  GitHub Pages URL (once enabled):"
echo "  https://${OWNER}.github.io/${REPO_NAME}/"
echo ""
echo "  Next steps:"
echo "  1. Go to the repo Settings → Pages"
echo "  2. Set Source to 'GitHub Actions'"
echo "  3. The deployment will start automatically"
echo ""
echo "  Or run: gh api repos/${OWNER}/${REPO_NAME}/pages -X POST -f build_type=workflow"
echo ""
