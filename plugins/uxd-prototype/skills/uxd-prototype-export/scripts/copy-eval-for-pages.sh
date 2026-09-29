#!/usr/bin/env bash
# Copy an evaluation report into a static Pages tree for Prototype|Eval navigation.
# Working store: .artifacts/{ID}/eval/; Pages only needs a static copy.
#
# Usage:
#   bash copy-eval-for-pages.sh --artifacts .artifacts/PROJ-298 --pages-root public
#   bash copy-eval-for-pages.sh --artifacts .artifacts/PROJ-298/eval --pages-root public
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
      echo "Usage: bash copy-eval-for-pages.sh --artifacts <key-or-eval-dir> [--pages-root public] [--evals-dir evals]"
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

# Accept key root (.artifacts/PROJ-298) or eval dir (.artifacts/PROJ-298/eval)
if [[ "$(basename "$ARTIFACTS")" == "eval" ]]; then
  EVAL_DIR="$ARTIFACTS"
  KEY_DIR="$(dirname "$ARTIFACTS")"
  ID="$(basename "$KEY_DIR")"
else
  KEY_DIR="$ARTIFACTS"
  ID="$(basename "$KEY_DIR")"
  EVAL_DIR="$KEY_DIR/eval"
fi

REPORT="$EVAL_DIR/evaluation-report.html"
# Legacy / mis-pinned runs may leave the report at the key root
if [[ ! -f "$REPORT" && -f "$KEY_DIR/evaluation-report.html" ]]; then
  REPORT="$KEY_DIR/evaluation-report.html"
  EVAL_DIR="$KEY_DIR"
fi

if [[ ! -f "$REPORT" ]]; then
  echo "Error: evaluation-report.html not found in $KEY_DIR/eval/ (or key root)" >&2
  exit 1
fi

DEST_DIR="${PAGES_ROOT%/}/${EVALS_DIR%/}/${ID}"
mkdir -p "$DEST_DIR"
cp "$REPORT" "$DEST_DIR/index.html"

# Optional companions for richer static hosting
[[ -f "$EVAL_DIR/evaluation-report.csv" ]] && cp "$EVAL_DIR/evaluation-report.csv" "$DEST_DIR/"
[[ -f "$KEY_DIR/prototype-bar.json" ]] && cp "$KEY_DIR/prototype-bar.json" "$DEST_DIR/"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/sync-prototype-bar-config.mjs" ]] && command -v node >/dev/null 2>&1; then
  # prototype-bar.json lives at the key root
  node "$SCRIPT_DIR/sync-prototype-bar-config.mjs" \
    --artifacts "$KEY_DIR" \
    --eval-url "/${EVALS_DIR%/}/${ID}/" || true
fi

# Embed Prototype Bar so Eval pages keep Prototype|Eval chrome (same as helper serve)
if [[ -f "$SCRIPT_DIR/inject-prototype-bar-into-html.mjs" ]] && command -v node >/dev/null 2>&1; then
  node "$SCRIPT_DIR/inject-prototype-bar-into-html.mjs" \
    --html "$DEST_DIR/index.html" \
    --artifacts "$KEY_DIR" \
    --view eval || echo "Warning: Prototype Bar inject failed for $DEST_DIR/index.html" >&2
fi

echo "Copied eval report → $DEST_DIR/index.html"
echo "Prototype Bar Eval path: /${EVALS_DIR%/}/${ID}/"
