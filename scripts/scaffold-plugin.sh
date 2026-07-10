#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PLUGIN="${1:-}"
DESC="${2:-}"

if [ -z "$PLUGIN" ] || [ -z "$DESC" ]; then
  echo "Usage: make scaffold-plugin PLUGIN=<name> DESC=\"what this plugin helps people do\""
  echo ""
  echo "Examples:"
  echo "  make scaffold-plugin PLUGIN=sprint-ops DESC=\"Sprint operations and release workflows\""
  echo "  make scaffold-plugin PLUGIN=prototyping DESC=\"Rapid prototyping and design exploration\""
  exit 1
fi

# Determine path based on prefix
if [[ "$PLUGIN" == pf-* ]] || [[ "$PLUGIN" == patternfly-* ]]; then
  PLUGIN_DIR="plugins/patternfly/${PLUGIN}"
else
  PLUGIN_DIR="plugins/${PLUGIN}"
fi

if [ -d "$PLUGIN_DIR" ]; then
  echo "Error: Plugin directory already exists: ${PLUGIN_DIR}"
  exit 1
fi

# Create directory structure
mkdir -p "${PLUGIN_DIR}/.claude-plugin"
mkdir -p "${PLUGIN_DIR}/.cursor-plugin"
mkdir -p "${PLUGIN_DIR}/skills"
mkdir -p "${PLUGIN_DIR}/agents"

# Determine repo URL
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "https://github.com/org/uxd-ai-helpers")

# Write identical plugin.json to both directories
for tool_dir in .claude-plugin .cursor-plugin; do
  cat > "${PLUGIN_DIR}/${tool_dir}/plugin.json" << EOF
{
  "name": "${PLUGIN}",
  "description": "${DESC}",
  "author": {
    "name": "UXD Team"
  },
  "repository": "${REPO_URL}"
}
EOF
done

echo "Created: ${PLUGIN_DIR}/"
echo ""
echo "Directory structure:"
find "${PLUGIN_DIR}" -type f -o -type d | head -20
echo ""
echo "Next steps:"
echo "  1. Add the plugin to .claude-plugin/marketplace.json"
echo "  2. Add the plugin to .cursor-plugin/marketplace.json"
echo "  3. Create your first skill: make scaffold PLUGIN=${PLUGIN} SKILL=<skill-name>"
echo "  4. Run 'make validate' to check consistency"
echo "  5. Run 'make generate' to update PLUGINS.md"
echo "  6. Open a PR"
