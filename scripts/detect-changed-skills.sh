#!/usr/bin/env bash
set -euo pipefail

# Detect which skills changed in a PR and have corresponding evals.
# Outputs JSON array for GitHub Actions matrix and sets has_evals flag.
#
# Evals are colocated with their skills:
#   plugins/<domain>/<plugin>/skills/<skill>/eval/eval.yaml
#   plugins/<domain>/<plugin>/agents/<agent>-eval/eval.yaml
#
# Usage:
#   In GitHub Actions:  scripts/detect-changed-skills.sh [--skill <name>]
#   Locally:            scripts/detect-changed-skills.sh --base main

if ((BASH_VERSINFO[0] < 4)); then
  echo "Error: bash 4+ required (declare -A). macOS ships bash 3 — use 'brew install bash'." >&2
  exit 1
fi

SKILL_NAME=""
BASE_BRANCH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill) SKILL_NAME="$2"; shift 2 ;;
    --base) BASE_BRANCH="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Build a map of skill-name → eval.yaml path by scanning the tree
declare -A EVAL_PATHS
while IFS= read -r eval_file; do
  # eval.yaml lives at .../<skill-or-agent>/eval/eval.yaml
  dir=$(dirname "$eval_file")          # .../<skill>/eval
  name=$(basename "$(dirname "$dir")") # <skill>
  # For agent evals named <agent>-eval/, strip the suffix
  if [[ "$eval_file" == *"/agents/"* ]]; then
    name="${name%-eval}"
  fi
  EVAL_PATHS["$name"]="$eval_file"
done < <(find plugins -path '*/eval/eval.yaml' 2>/dev/null)

if [[ -n "$SKILL_NAME" ]]; then
  if [[ -n "${EVAL_PATHS[$SKILL_NAME]:-}" ]]; then
    echo "skills=[\"${SKILL_NAME}\"]"
    echo "has_evals=true"
  else
    echo "No eval found for skill: ${SKILL_NAME}" >&2
    echo "skills=[]"
    echo "has_evals=false"
  fi
  exit 0
fi

if [[ -n "${GITHUB_EVENT_NAME:-}" && "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
  CHANGED_FILES=$(gh pr diff "$PR_NUMBER" --name-only 2>/dev/null || git diff --name-only "origin/${BASE_BRANCH:-main}...HEAD")
elif [[ -n "$BASE_BRANCH" ]]; then
  CHANGED_FILES=$(git diff --name-only "${BASE_BRANCH}...HEAD")
else
  CHANGED_FILES=$(git diff --name-only "origin/main...HEAD")
fi

declare -A SKILLS_SEEN

while IFS= read -r file; do
  [[ -z "$file" ]] && continue

  # Match skills: plugins/patternfly/<plugin>/skills/<skill>/ or plugins/<plugin>/skills/<skill>/
  if [[ "$file" =~ ^plugins/patternfly/([^/]+)/skills/([^/]+)/ ]]; then
    plugin="${BASH_REMATCH[1]}"
    skill="${BASH_REMATCH[2]}"
    [[ "$plugin" != *-workshop ]] && SKILLS_SEEN["$skill"]=1
  elif [[ "$file" =~ ^plugins/([^/]+)/skills/([^/]+)/ ]]; then
    plugin="${BASH_REMATCH[1]}"
    skill="${BASH_REMATCH[2]}"
    [[ "$plugin" != *-workshop ]] && SKILLS_SEEN["$skill"]=1
  fi

  # Match agent evals: plugins/patternfly/<plugin>/agents/<agent>-eval/
  if [[ "$file" =~ ^plugins/patternfly/([^/]+)/agents/([^/]+)-eval/ ]]; then
    agent="${BASH_REMATCH[2]}"
    SKILLS_SEEN["$agent"]=1
  fi
done <<< "$CHANGED_FILES"

EVAL_SKILLS=()
for skill in "${!SKILLS_SEEN[@]}"; do
  if [[ -n "${EVAL_PATHS[$skill]:-}" ]]; then
    EVAL_SKILLS+=("\"${skill}\"")
  fi
done

if [[ ${#EVAL_SKILLS[@]} -eq 0 ]]; then
  echo "skills=[]"
  echo "has_evals=false"
else
  IFS=','
  echo "skills=[${EVAL_SKILLS[*]}]"
  unset IFS
  echo "has_evals=true"
fi
