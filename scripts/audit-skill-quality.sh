#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

command -v python3 >/dev/null 2>&1 || {
  printf 'Error: Python 3 is required for token breakdown analysis.\n' >&2
  exit 2
}

AUDIT_VERSION="uxd-skill-quality-audit@0.1.0"
WATERMARK="$ROOT/.skill-audit.json"
ERRORS=0
NO_WATERMARK="${NO_WATERMARK:-false}"
RESULTS=()

fail() {
  printf 'FAIL: %s: %s\n' "$1" "$2"
  ERRORS=$((ERRORS + 1))
}

frontmatter_field() {
  local file="$1" field="$2"
  awk -v field="$field" '
    /^---$/ { delimiters++; next }
    delimiters == 1 && $0 ~ "^" field ":" {
      sub("^" field ": *", "")
      print
      exit
    }
  ' "$file" | sed 's/^"//;s/"$//'
}

description_text() {
  local file="$1"
  awk '
    /^---$/ { delimiters++; next }
    delimiters == 1 && /^description:/ {
      sub(/^description:[[:space:]]*/, "")
      sub(/^>-?[[:space:]]*/, "")
      if ($0) text=text " " $0
      reading=1
      next
    }
    reading && delimiters == 1 && /^[a-zA-Z_-]+:/ { reading=0 }
    reading && delimiters == 1 { text=text " " $0 }
    END { gsub(/[[:space:]]+/, " ", text); sub(/^ /, "", text); print text }
  ' "$file"
}

plugin_dir_for() {
  dirname "$(dirname "$(dirname "$1")")"
}

is_consumer_skill() {
  local plugin_dir
  plugin_dir=$(plugin_dir_for "$1")
  ! grep -q '"category"[[:space:]]*:[[:space:]]*"workshop"' "$plugin_dir/.claude-plugin/plugin.json" 2>/dev/null
}

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

audit_file() {
  local file="$1"
  local skill_dir name description lines core_words reference_words eval_words other_words
  local core_tokens reference_tokens eval_tokens other_tokens tokens size audience inputs outputs hash eval_file

  [ -f "$file" ] || { fail "$file" "file not found"; return; }
  skill_dir=$(dirname "$file")
  name=$(frontmatter_field "$file" name)
  description=$(description_text "$file")
  lines=$(wc -l < "$file" | tr -d ' ')
  local token_breakdown
  if ! token_breakdown=$(python3 - "$skill_dir" "$file" <<'PY'
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve()
skill_file = pathlib.Path(sys.argv[2]).resolve()
counts = {"core": 0, "references": 0, "eval": 0, "other": 0}
extensions = {".md", ".yaml", ".yml"}

for path in sorted(root.rglob("*")):
    if not path.is_file() or path.suffix not in extensions:
        continue
    words = len(re.findall(r"\S+", path.read_text(encoding="utf-8")))
    relative = path.relative_to(root)
    if path == skill_file:
        bucket = "core"
    elif "references" in relative.parts:
        bucket = "references"
    elif "eval" in relative.parts:
        bucket = "eval"
    else:
        bucket = "other"
    counts[bucket] += words

print(counts["core"], counts["references"], counts["eval"], counts["other"])
PY
  ); then
    fail "$file" "unable to calculate token breakdown"
    return
  fi
  read -r core_words reference_words eval_words other_words <<< "$token_breakdown"
  core_words=${core_words:-0}
  reference_words=${reference_words:-0}
  eval_words=${eval_words:-0}
  other_words=${other_words:-0}
  core_tokens=$(( (core_words * 13 + 9) / 10 ))
  reference_tokens=$(( (reference_words * 13 + 9) / 10 ))
  eval_tokens=$(( (eval_words * 13 + 9) / 10 ))
  other_tokens=$(( (other_words * 13 + 9) / 10 ))
  tokens=$((core_tokens + reference_tokens + eval_tokens + other_tokens))
  if [ "$tokens" -le 1000 ]; then size="S";
  elif [ "$tokens" -le 3000 ]; then size="M";
  elif [ "$tokens" -le 10000 ]; then size="L";
  else size="XL"; fi
  audience=$(frontmatter_field "$file" audience)
  inputs=$(frontmatter_field "$file" inputs)
  outputs=$(frontmatter_field "$file" outputs)
  hash=$(hash_file "$file")
  eval_file="$skill_dir/eval/eval.yaml"

  [ "$name" = "$(basename "$skill_dir")" ] || fail "$file" "frontmatter name must match its directory"
  [[ "$name" =~ ^(pf|uxd)- ]] || fail "$file" "name must start with pf- or uxd-"
  [[ "$description" =~ ^(Analyze|Audit|Build|Check|Clone|Conduct|Create|Deploy|Diff|Enable|Evaluate|Find|Flag|Generate|Identify|Integrate|Map|Produce|Publish|Recommend|Review|Run|Scan|Scaffold|Summarize|Test|Update|Validate|Write) ]] || fail "$file" "description should start with an action verb"
  [[ "$description" == *"Use when"* ]] || fail "$file" "description should include a Use when context"
  [ "$lines" -le 500 ] || fail "$file" "skill exceeds 500 lines ($lines)"
  [ -n "$audience" ] || fail "$file" "missing audience metadata"
  [ -n "$inputs" ] || fail "$file" "missing inputs metadata"
  [ -n "$outputs" ] || fail "$file" "missing outputs metadata"
  grep -qiE '^##+ .*example|^##+ output' "$file" || fail "$file" "missing an example or output section"
  grep -q '^```' "$file" || fail "$file" "missing a fenced output example"

  if is_consumer_skill "$file"; then
    [ -f "$eval_file" ] || fail "$file" "consumer skill is missing eval/eval.yaml"
    if [ -f "$eval_file" ]; then
      grep -q '^dataset:' "$eval_file" || fail "$eval_file" "missing dataset configuration"
      [ -d "$skill_dir/eval/cases" ] || fail "$eval_file" "missing eval/cases directory"
      [ -n "$(find "$skill_dir/eval/cases" -mindepth 1 -maxdepth 1 -type d -print -quit)" ] || fail "$eval_file" "eval/cases has no test cases"
    fi
  fi

  if [ "$tokens" -gt 2000 ]; then
    printf 'WARN: %s: estimated prompt footprint is high (~%s tokens)\n' "$file" "$tokens"
  fi
  printf 'Token footprint: core=%s, references=%s, eval=%s, other=%s, total=%s (%s)\n' \
    "$core_tokens" "$reference_tokens" "$eval_tokens" "$other_tokens" "$tokens" "$size"
  if [ "$core_tokens" -gt 1000 ]; then
    printf 'RECOMMEND: %s: move long examples, schemas, or background guidance from SKILL.md into references/\n' "$file"
  fi
  if [ "$tokens" -gt 2000 ] && [ "$reference_words" -eq 0 ]; then
    printf 'RECOMMEND: %s: create references/ and move supporting detail out of the core skill\n' "$file"
  fi
  if [ "$lines" -gt 300 ]; then
    printf 'RECOMMEND: %s: keep the core instructions focused and move optional detail into references/\n' "$file"
  fi
  RESULTS+=("$file|$tokens|$size|$core_tokens|$reference_tokens|$eval_tokens|$other_tokens|$hash")
  printf 'PASS: %s (%s)\n' "$file" "$size"
}

paths=()
if [ -n "${SKILLS:-}" ]; then
  read -r -a paths <<< "$SKILLS"
fi
for arg in "$@"; do
  if [ "$arg" = "--no-watermark" ]; then
    NO_WATERMARK=true
  else
    paths+=("$arg")
  fi
done

if [ "${#paths[@]}" -eq 0 ]; then
  base_ref="${BASE_SHA:-}"
  if [ -z "$base_ref" ]; then
    if git rev-parse --verify main >/dev/null 2>&1; then
      base_ref="main"
    elif git rev-parse --verify origin/main >/dev/null 2>&1; then
      base_ref="origin/main"
    fi
  fi

  if [ -n "$base_ref" ] && ! git rev-parse --verify "${base_ref}^{commit}" >/dev/null 2>&1; then
    printf 'Invalid BASE_SHA or base ref: %s\n' "$base_ref" >&2
    exit 2
  fi

  while IFS= read -r file; do
    [ -n "$file" ] && paths+=("$file")
  done < <(
    {
      git diff --name-only --diff-filter=ACMR HEAD -- 'plugins/**/SKILL.md'
      git ls-files --others --exclude-standard -- 'plugins/**/SKILL.md'
      if [ -n "$base_ref" ]; then
        git diff --name-only --diff-filter=ACMR "$base_ref...HEAD" -- 'plugins/**/SKILL.md'
      fi
    } | sort -u
  )

  if [ -z "$base_ref" ] && [ "${#paths[@]}" -eq 0 ]; then
    printf 'Cannot detect changed skills: no main or origin/main ref is available. Pass SKILLS="path/to/SKILL.md".\n' >&2
    exit 2
  fi
fi

if [ "${#paths[@]}" -eq 0 ]; then
  printf 'No changed skill files found.\n'
  exit 0
fi

for file in "${paths[@]}"; do
  audit_file "$file"
done

if [ "$ERRORS" -eq 0 ] && [ "$NO_WATERMARK" = false ]; then
  {
    printf '{\n  "audit": "%s",\n  "timestamp": "%s",\n  "commit": "%s",\n  "status": "pass",\n  "skills": [' \
      "$AUDIT_VERSION" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(git rev-parse --short HEAD)"
    first=true
    for result in "${RESULTS[@]}"; do
      IFS='|' read -r path tokens size core_tokens reference_tokens eval_tokens other_tokens hash <<< "$result"
      [ "$first" = true ] || printf ','
      first=false
      printf '\n    {"path": "%s", "estimated_tokens": %s, "relative_size": "%s", "breakdown": {"core": %s, "references": %s, "eval": %s, "other": %s}, "sha256": "%s"}' \
        "$path" "$tokens" "$size" "$core_tokens" "$reference_tokens" "$eval_tokens" "$other_tokens" "$hash"
    done
    printf '\n  ]\n}\n'
  } > "$WATERMARK"
  printf 'Wrote %s\n' "$WATERMARK"
fi

if [ "$ERRORS" -gt 0 ]; then
  printf '%s error(s) found.\n' "$ERRORS"
  exit 1
fi
printf 'Audit passed for %s skill(s).\n' "${#RESULTS[@]}"
