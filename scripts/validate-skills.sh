#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

ERRORS=0
VALID_PREFIXES="pf|uxd"

fail() {
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error file=${1}::${2}"
  else
    echo "  FAIL: ${1}: ${2}"
  fi
  ERRORS=$((ERRORS + 1))
}

parse_frontmatter() {
  local file="$1" field="$2"
  awk '/^---$/{if(++c==2)exit} c==1 && /^'"$field"':/{sub(/^'"$field"': */, ""); gsub(/["'"'"']/, ""); print; exit}' "$file"
}

# Skills
while IFS= read -r skill_file; do
  dir_name=$(basename "$(dirname "$skill_file")")
  fm_name=$(parse_frontmatter "$skill_file" "name")
  fm_desc=$(parse_frontmatter "$skill_file" "description")

  if [[ -z "$fm_name" ]]; then
    fail "$skill_file" "Missing 'name' in frontmatter"
  elif [[ "$fm_name" != "$dir_name" ]]; then
    fail "$skill_file" "Frontmatter name '${fm_name}' does not match directory '${dir_name}'"
  fi

  if [[ -z "$fm_desc" ]]; then
    fail "$skill_file" "Missing 'description' in frontmatter"
  fi

  line_count=$(wc -l < "$skill_file" | tr -d ' ')
  if [[ "$line_count" -gt 500 ]]; then
    fail "$skill_file" "Skill exceeds 500-line limit (${line_count} lines)"
  fi

  if [[ -n "$fm_name" ]] && [[ ! "$fm_name" =~ ^($VALID_PREFIXES)- ]]; then
    fail "$skill_file" "Skill name '${fm_name}' must start with a valid prefix (${VALID_PREFIXES})"
  fi
done < <(find plugins -name 'SKILL.md' 2>/dev/null)

# Agents
while IFS= read -r agent_file; do
  file_name=$(basename "$agent_file" .md)
  fm_name=$(parse_frontmatter "$agent_file" "name")
  fm_desc=$(parse_frontmatter "$agent_file" "description")

  if [[ -z "$fm_name" ]]; then
    fail "$agent_file" "Missing 'name' in frontmatter"
  elif [[ "$fm_name" != "$file_name" ]]; then
    fail "$agent_file" "Frontmatter name '${fm_name}' does not match filename '${file_name}'"
  fi

  if [[ -z "$fm_desc" ]]; then
    fail "$agent_file" "Missing 'description' in frontmatter"
  fi

  if [[ -n "$fm_name" ]] && [[ ! "$fm_name" =~ ^($VALID_PREFIXES)- ]]; then
    fail "$agent_file" "Agent name '${fm_name}' must start with a valid prefix (${VALID_PREFIXES})"
  fi
done < <(find plugins -path '*/agents/*.md' -not -path '*/agents/*/*.md' 2>/dev/null)

SKILL_COUNT=$(find plugins -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ')
AGENT_COUNT=$(find plugins -path '*/agents/*.md' -not -path '*/agents/*/*.md' 2>/dev/null | wc -l | tr -d ' ')

if [[ "$ERRORS" -gt 0 ]]; then
  echo "${ERRORS} error(s) found."
  exit 1
else
  echo "Validated ${SKILL_COUNT} skill(s) and ${AGENT_COUNT} agent(s), 0 errors."
fi
