#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

ERRORS=0
CHECKED=0

fail() {
  echo "  FAIL: $1"
  ERRORS=$((ERRORS + 1))
}

# 1. Marketplace-level manifest parity
echo "=== Marketplace manifests ==="
if [ -f .claude-plugin/marketplace.json ] && [ -f .cursor-plugin/marketplace.json ]; then
  if ! diff -q .claude-plugin/marketplace.json .cursor-plugin/marketplace.json > /dev/null 2>&1; then
    fail "Marketplace manifests differ between .claude-plugin/ and .cursor-plugin/"
    diff --unified .claude-plugin/marketplace.json .cursor-plugin/marketplace.json || true
  else
    echo "  OK: marketplace.json files are identical"
  fi
  CHECKED=$((CHECKED + 1))
fi

# 2. Plugin-level manifest parity (handles both flat and nested plugins)
echo ""
echo "=== Plugin manifests ==="
find plugins -name 'plugin.json' -path '*/.claude-plugin/*' | while read -r claude_manifest; do
  plugin_dir=$(dirname "$(dirname "$claude_manifest")")
  cursor_manifest="${plugin_dir}/.cursor-plugin/plugin.json"
  plugin_name=$(basename "$plugin_dir")

  echo "  Checking: ${plugin_dir}"

  if [ ! -f "$cursor_manifest" ]; then
    fail "${plugin_name}: missing .cursor-plugin/plugin.json"
    continue
  fi

  if ! diff -q "$claude_manifest" "$cursor_manifest" > /dev/null 2>&1; then
    fail "${plugin_name}: .claude-plugin/plugin.json and .cursor-plugin/plugin.json differ"
    diff --unified "$claude_manifest" "$cursor_manifest" || true
  fi
done
CHECKED=$((CHECKED + $(find plugins -name 'plugin.json' -path '*/.claude-plugin/*' | wc -l | tr -d ' ')))

# 3. JSON validity
echo ""
echo "=== JSON validity ==="
find . -name 'plugin.json' -o -name 'marketplace.json' | grep -v node_modules | grep -v .git/ | while read -r json_file; do
  if ! python3 -m json.tool "$json_file" > /dev/null 2>&1; then
    fail "${json_file}: invalid JSON"
  fi
done

# 4. Skill name/directory match
echo ""
echo "=== Skill name consistency ==="
find plugins -name 'SKILL.md' | while read -r skill_file; do
  dir_name=$(basename "$(dirname "$skill_file")")
  fm_name=$(awk '/^---$/{if(++c==2)exit} c==1 && /^name:/{sub(/^name: */, ""); gsub(/["'"'"']/, ""); print; exit}' "$skill_file")

  if [ -z "$fm_name" ]; then
    fail "${skill_file}: missing 'name' in frontmatter"
  elif [ "$fm_name" != "$dir_name" ]; then
    fail "${skill_file}: frontmatter name '${fm_name}' does not match directory '${dir_name}'"
  fi
done

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "${ERRORS} error(s) found."
  exit 1
else
  echo "Validated ${CHECKED} manifest pairs, 0 errors."
fi
