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
#
# Cursor may list fewer plugins than Claude (e.g. when a meta-plugin bundles
# sub-plugins via explicit paths instead of listing them individually).
# Rules: metadata (name, owner) must match; every Cursor plugin must also
# appear in the Claude manifest; Claude may have extras.
echo "=== Marketplace manifests ==="
if [ -f .claude-plugin/marketplace.json ] && [ -f .cursor-plugin/marketplace.json ]; then
  if diff -q .claude-plugin/marketplace.json .cursor-plugin/marketplace.json > /dev/null 2>&1; then
    echo "  OK: marketplace.json files are identical"
  elif ! python3 - .claude-plugin/marketplace.json .cursor-plugin/marketplace.json <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    claude = json.load(f)
with open(sys.argv[2]) as f:
    cursor = json.load(f)
# Metadata must match
for key in ("name", "owner"):
    if claude.get(key) != cursor.get(key):
        print(f"  FAIL: marketplace.json '{key}' differs", file=sys.stderr)
        sys.exit(1)
# Every Cursor plugin must exist in Claude's list
claude_names = {p["name"] for p in claude.get("plugins", [])}
for plugin in cursor.get("plugins", []):
    if plugin["name"] not in claude_names:
        print(f"  FAIL: Cursor marketplace lists '{plugin['name']}' which is not in Claude marketplace", file=sys.stderr)
        sys.exit(1)
# Find matching plugins and verify shared fields match
claude_plugins = {p["name"]: p for p in claude.get("plugins", [])}
for plugin in cursor.get("plugins", []):
    claude_plugin = claude_plugins[plugin["name"]]
    if plugin != claude_plugin:
        print(f"  FAIL: marketplace plugin '{plugin['name']}' differs between Claude and Cursor", file=sys.stderr)
        sys.exit(1)
c_count = len(cursor.get("plugins", []))
d_count = len(claude.get("plugins", []))
if c_count < d_count:
    print(f"  OK: Cursor marketplace is a subset ({c_count}/{d_count} plugins) — meta-plugin bundles the rest")
else:
    print(f"  OK: marketplace.json plugins match ({c_count} plugins)")
PY
  then
    fail "Marketplace manifests differ incompatibly"
    diff --unified .claude-plugin/marketplace.json .cursor-plugin/marketplace.json || true
  fi
  CHECKED=$((CHECKED + 1))
fi

# 2. Plugin-level manifest parity (handles both flat and nested plugins)
#
# Cursor may add path-override / MCP fields that Claude does not use
# (skills, agents, commands, rules, hooks, mcpServers). Shared fields must
# still match so Claude deps and metadata stay in sync.
echo ""
echo "=== Plugin manifests ==="
while read -r claude_manifest; do
  plugin_dir=$(dirname "$(dirname "$claude_manifest")")
  cursor_manifest="${plugin_dir}/.cursor-plugin/plugin.json"
  plugin_name=$(basename "$plugin_dir")

  echo "  Checking: ${plugin_dir}"

  if [ ! -f "$cursor_manifest" ]; then
    fail "${plugin_name}: missing .cursor-plugin/plugin.json"
    continue
  fi

  if diff -q "$claude_manifest" "$cursor_manifest" > /dev/null 2>&1; then
    continue
  fi

  # Allow Cursor-only component path / MCP fields; compare the rest.
  if ! python3 - "$claude_manifest" "$cursor_manifest" "$plugin_name" <<'PY'
import json, sys
claude_path, cursor_path, name = sys.argv[1:4]
cursor_only = {"skills", "agents", "commands", "rules", "hooks", "mcpServers"}
with open(claude_path) as f:
    claude = json.load(f)
with open(cursor_path) as f:
    cursor = json.load(f)
claude_extra = set(claude) - set(cursor)
cursor_shared = {k: v for k, v in cursor.items() if k not in cursor_only}
claude_shared = {k: v for k, v in claude.items() if k not in cursor_only}
# Claude should not carry Cursor-only path overrides (keep Claude lean).
if set(claude) & cursor_only:
    print(f"  FAIL: {name}: .claude-plugin/plugin.json has Cursor-only fields: {sorted(set(claude) & cursor_only)}", file=sys.stderr)
    sys.exit(1)
if claude_shared != cursor_shared:
    print(f"  FAIL: {name}: shared plugin.json fields differ between Claude and Cursor", file=sys.stderr)
    sys.exit(1)
if claude_extra:
    print(f"  FAIL: {name}: Claude has keys missing from Cursor: {sorted(claude_extra)}", file=sys.stderr)
    sys.exit(1)
print(f"  OK: {name}: Cursor adds path overrides; shared fields match")
PY
  then
    fail "${plugin_name}: .claude-plugin/plugin.json and .cursor-plugin/plugin.json differ incompatibly"
    diff --unified "$claude_manifest" "$cursor_manifest" || true
  fi
done < <(find plugins -name 'plugin.json' -path '*/.claude-plugin/*')
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

# 5. Agent name/filename match
echo ""
echo "=== Agent name consistency ==="
find plugins -path '*/agents/*.md' -not -path '*/agents/*/*.md' | while read -r agent_file; do
  file_name=$(basename "$agent_file" .md)
  fm_name=$(awk '/^---$/{if(++c==2)exit} c==1 && /^name:/{sub(/^name: */, ""); gsub(/["'"'"']/, ""); print; exit}' "$agent_file")

  if [ -z "$fm_name" ]; then
    fail "${agent_file}: missing 'name' in frontmatter"
  elif [ "$fm_name" != "$file_name" ]; then
    fail "${agent_file}: frontmatter name '${fm_name}' does not match filename '${file_name}'"
  fi
done

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "${ERRORS} error(s) found."
  exit 1
else
  echo "Validated ${CHECKED} manifest pairs, 0 errors."
fi
