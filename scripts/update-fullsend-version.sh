#!/usr/bin/env bash
# Update Fullsend version pins across all workflow files.
# Usage: ./scripts/update-fullsend-version.sh [NEW_VERSION]
#   If NEW_VERSION is omitted, detects the latest stable release.
#
# Outputs machine-readable KEY=VALUE lines prefixed with "::out::" for
# CI wrappers to parse, plus human-readable progress on stdout.
set -euo pipefail

REPO="fullsend-ai/fullsend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Keep in sync with any new Fullsend workflow files added to this repo.
WORKFLOW_FILES=(
  ".github/workflows/fullsend.yaml"
  ".github/workflows/fullsend-poll-jira.yml"
  ".github/workflows/prioritize.yml"
)

emit() { echo "::out::$1=$2"; }

validate_version_format() {
  local ver="$1"
  if [[ ! "$ver" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    echo "ERROR: Invalid version format: $ver (expected vMAJOR.MINOR.PATCH)" >&2
    exit 1
  fi
}

get_current_version() {
  grep -o '# v[0-9][0-9a-zA-Z._-]*' "$ROOT_DIR/.github/workflows/fullsend.yaml" \
    | head -1 | sed 's/# //'
}

get_current_sha() {
  grep -o '@[0-9a-f]\{40\}' "$ROOT_DIR/.github/workflows/fullsend.yaml" \
    | head -1 | tr -d '@'
}

get_latest_release() {
  gh release list --repo "$REPO" --limit 10 --json tagName,isPrerelease \
    --jq '[.[] | select(.isPrerelease == false)][0].tagName'
}

resolve_sha() {
  local tag="$1"
  local deref sha
  deref=$(git ls-remote --tags "https://github.com/$REPO.git" "refs/tags/${tag}^{}" 2>/dev/null | awk '{print $1}')
  if [[ -n "$deref" ]]; then
    echo "$deref"
    return
  fi
  sha=$(git ls-remote --tags "https://github.com/$REPO.git" "refs/tags/$tag" | awk '{print $1}')
  if [[ -z "$sha" ]]; then
    echo "ERROR: Could not resolve SHA for tag $tag" >&2
    exit 1
  fi
  echo "$sha"
}

sed_inplace() {
  local expr="$1" file="$2"
  local tmp="$file.tmp"
  if sed "$expr" "$file" > "$tmp"; then
    mv -f "$tmp" "$file"
  else
    rm -f "$tmp"
    echo "ERROR: sed failed on $file" >&2
    exit 1
  fi
}

main() {
  local new_version="${1:-}"

  local current_version current_sha
  current_version=$(get_current_version)
  current_sha=$(get_current_sha)

  echo "Current version: $current_version"
  echo "Current SHA:     $current_sha"

  if [[ -z "$new_version" ]]; then
    new_version=$(get_latest_release)
    echo "Latest release:  $new_version"
  fi

  if [[ -z "$new_version" ]]; then
    echo "ERROR: Could not determine new version" >&2
    exit 1
  fi

  validate_version_format "$new_version"

  if [[ "$new_version" == "$current_version" ]]; then
    echo "Already at $new_version — nothing to do."
    emit "changed" "false"
    exit 0
  fi

  echo "Resolving SHA for $new_version..."
  local new_sha
  new_sha=$(resolve_sha "$new_version")
  echo "New SHA:         $new_sha"

  echo ""
  echo "Updating workflow files..."
  local updated=0
  for file in "${WORKFLOW_FILES[@]}"; do
    local filepath="$ROOT_DIR/$file"
    if [[ ! -f "$filepath" ]]; then
      echo "  SKIP $file (not found)"
      continue
    fi

    local changed=false

    if grep -q "@${current_sha}" "$filepath"; then
      sed_inplace "s/@${current_sha}/@${new_sha}/g" "$filepath"
      changed=true
    fi

    if grep -q "# ${current_version}" "$filepath"; then
      sed_inplace "s/# ${current_version}/# ${new_version}/g" "$filepath"
      changed=true
    fi

    if grep -q "gh release download ${current_version}" "$filepath"; then
      sed_inplace "s/gh release download ${current_version}/gh release download ${new_version}/g" "$filepath"
      changed=true
    fi

    if grep -q "fullsend_version: ${current_version}" "$filepath"; then
      sed_inplace "s/fullsend_version: ${current_version}/fullsend_version: ${new_version}/g" "$filepath"
      changed=true
    fi

    if [[ "$changed" == "true" ]]; then
      echo "  UPDATED $file"
      ((updated++)) || true
    else
      echo "  SKIP $file (no matching pins)"
    fi
  done

  echo ""
  echo "Updated $updated workflow file(s)."

  if [[ "$updated" -eq 0 ]]; then
    echo "ERROR: No files were updated — expected at least 1. Check WORKFLOW_FILES list." >&2
    exit 1
  fi

  # Verify no stale SHA references remain
  local stale_files
  stale_files=$(grep -rl "@${current_sha}" "${WORKFLOW_FILES[@]/#/$ROOT_DIR/}" 2>/dev/null || true)
  if [[ -n "$stale_files" ]]; then
    echo "ERROR: Old SHA still present in: $stale_files" >&2
    exit 1
  fi

  if command -v fullsend &>/dev/null; then
    echo ""
    echo "Regenerating lock.yaml..."
    (cd "$ROOT_DIR" && fullsend lock --all)
    echo "  UPDATED .fullsend/lock.yaml"
  else
    echo ""
    echo "NOTE: fullsend CLI not found — skipping lock.yaml regeneration."
    echo "      Run 'fullsend lock' manually or let CI regenerate it."
  fi

  emit "changed" "true"
  emit "old_version" "$current_version"
  emit "new_version" "$new_version"

  echo ""
  echo "=== Summary ==="
  echo "  ${current_version} (${current_sha:0:12})"
  echo "  -> ${new_version} (${new_sha:0:12})"
}

main "$@"
