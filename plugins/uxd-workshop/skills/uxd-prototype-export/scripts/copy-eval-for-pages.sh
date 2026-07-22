#!/usr/bin/env bash
# Copy an evaluation report into a static Pages tree for Prototype|Eval navigation.
# Keeps .artifacts/{ID}/ as the working store; Pages only needs a static copy.
#
# Usage:
#   bash copy-eval-for-pages.sh --artifacts .artifacts/PROJ-298 --pages-root public
#   bash copy-eval-for-pages.sh --artifacts .artifacts/PROJ-298 --pages-root dist --evals-dir evals
#
# Result:
#   {pages-root}/{evals-dir}/{ID}/index.html
set -euo pipefail

ARTIFACTS=""
PAGES_ROOT="public"
EVALS_DIR="evals"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifacts) ARTIFACTS="${2:-}"; shift 2 ;;
    --pages-root) PAGES_ROOT="${2:-}"; shift 2 ;;
    --evals-dir) EVALS_DIR="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: bash copy-eval-for-pages.sh --artifacts <dir> [--pages-root public] [--evals-dir evals]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ARTIFACTS" ]]; then
  echo "Error: --artifacts is required" >&2
  exit 1
fi

ARTIFACTS="$(cd "$ARTIFACTS" && pwd)"
ID="$(basename "$ARTIFACTS")"
REPORT="$ARTIFACTS/evaluation-report.html"

if [[ ! -f "$REPORT" ]]; then
  echo "Error: evaluation-report.html not found in $ARTIFACTS" >&2
  exit 1
fi

DEST_DIR="${PAGES_ROOT%/}/${EVALS_DIR%/}/${ID}"
mkdir -p "$DEST_DIR"
cp "$REPORT" "$DEST_DIR/index.html"

# Optional companions for richer static hosting
[[ -f "$ARTIFACTS/evaluation-report.csv" ]] && cp "$ARTIFACTS/evaluation-report.csv" "$DEST_DIR/"
[[ -f "$ARTIFACTS/prototype-bar.json" ]] && cp "$ARTIFACTS/prototype-bar.json" "$DEST_DIR/"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/sync-prototype-bar-config.mjs" ]] && command -v node >/dev/null 2>&1; then
  node "$SCRIPT_DIR/sync-prototype-bar-config.mjs" \
    --artifacts "$ARTIFACTS" \
    --eval-url "/${EVALS_DIR%/}/${ID}/" || true
fi

echo "Copied eval report → $DEST_DIR/index.html"
echo "Prototype Bar Eval path: /${EVALS_DIR%/}/${ID}/"
