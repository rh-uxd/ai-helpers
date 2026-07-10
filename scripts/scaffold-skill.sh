#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PLUGIN="${1:-}"
SKILL="${2:-}"

if [ -z "$PLUGIN" ] || [ -z "$SKILL" ]; then
  echo "Usage: make scaffold PLUGIN=<plugin-name> SKILL=<skill-name>"
  echo ""
  echo "Examples:"
  echo "  make scaffold PLUGIN=react SKILL=pf-my-skill"
  echo "  make scaffold PLUGIN=uxd-workshop SKILL=uxd-my-skill"
  echo ""
  echo "Available plugins:"
  find plugins -maxdepth 2 -name 'plugin.json' -path '*/.claude-plugin/*' \
    -exec dirname {} \; | xargs -I{} dirname {} | sed 's|plugins/||' | sort
  exit 1
fi

# Resolve plugin path (handles both flat and nested)
if [ -d "plugins/${PLUGIN}" ]; then
  PLUGIN_DIR="plugins/${PLUGIN}"
elif [ -d "plugins/patternfly/${PLUGIN}" ]; then
  PLUGIN_DIR="plugins/patternfly/${PLUGIN}"
else
  echo "Error: Plugin '${PLUGIN}' not found."
  echo ""
  echo "Available plugins:"
  find plugins -maxdepth 2 -name 'plugin.json' -path '*/.claude-plugin/*' \
    -exec dirname {} \; | xargs -I{} dirname {} | sed 's|plugins/||' | sort
  exit 1
fi

SKILL_DIR="${PLUGIN_DIR}/skills/${SKILL}"

if [ -d "$SKILL_DIR" ]; then
  echo "Error: Skill directory already exists: ${SKILL_DIR}"
  exit 1
fi

mkdir -p "${SKILL_DIR}"

cat > "${SKILL_DIR}/SKILL.md" << 'TEMPLATE'
---
name: SKILL_NAME_PLACEHOLDER
description: >-
  [Action verb] [what it does]. Use when [trigger context].
---

# [Skill Title]

[What this skill does in 1-2 sentences.]

## Steps

1. [First step]
2. [Second step]
3. [Third step]

## Output

[Describe the expected output format.]
TEMPLATE

sed -i '' "s/SKILL_NAME_PLACEHOLDER/${SKILL}/" "${SKILL_DIR}/SKILL.md"

echo "Created: ${SKILL_DIR}/SKILL.md"
echo ""
echo "Next steps:"
echo "  1. Edit ${SKILL_DIR}/SKILL.md — fill in the description and instructions"
echo "  2. Test locally: invoke /${PLUGIN}:${SKILL} on a real scenario"
echo "  3. Run 'make validate' to check consistency"
echo "  4. Open a PR"
