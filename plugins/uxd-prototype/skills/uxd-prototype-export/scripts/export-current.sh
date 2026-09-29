#!/usr/bin/env bash
# Capture a single URL as static HTML, component tree, and/or PF implementation spec.
# Usage: bash export-current.sh --url <url> --out <dir> [--formats html,tree,pf-spec]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL=""
OUT=""
FORMATS="html"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --formats) FORMATS="${2:-html}"; shift 2 ;;
    -h|--help)
      echo "Usage: bash export-current.sh --url <url> --out <dir> [--formats html,tree,pf-spec]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$URL" || -z "$OUT" ]]; then
  echo "Error: --url and --out are required" >&2
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "Error: Node.js required" >&2; exit 1; }

# Prefer local playwright from skill package
if [[ ! -d "$SCRIPT_DIR/../node_modules/playwright" ]]; then
  echo "Installing skill dependencies (playwright)..."
  (cd "$SCRIPT_DIR/.." && npm install)
fi

mkdir -p "$OUT"

# Write a one-off journeys file with a single exportable step
TMP_JOURNEYS="$(mktemp)"
ROUTE_PATH="$(node -e "const u=new URL(process.argv[1]); process.stdout.write(u.pathname+(u.search||''))" "$URL")"
BASE="$(node -e "const u=new URL(process.argv[1]); process.stdout.write(u.origin)" "$URL")"
STEP_ID="$(node -e "const p=process.argv[1].replace(/\\/+$/,'').split('/').filter(Boolean).join('-')||'page'; process.stdout.write(p.replace(/[^a-zA-Z0-9_-]+/g,'-'))" "$ROUTE_PATH")"

cat > "$TMP_JOURNEYS" <<EOF
{
  "prototype_id": "ad-hoc",
  "extracted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "journeys": [
    {
      "id": "current",
      "title": "Current page",
      "source": "user",
      "steps": [
        {
          "id": "$STEP_ID",
          "name": "$ROUTE_PATH",
          "route": "$ROUTE_PATH",
          "export": true
        }
      ]
    }
  ]
}
EOF

cleanup() { rm -f "$TMP_JOURNEYS"; }
trap cleanup EXIT

node "$SCRIPT_DIR/export-journey.mjs" \
  --base-url "$BASE" \
  --journeys "$TMP_JOURNEYS" \
  --out "$OUT" \
  --formats "$FORMATS"

echo "Done. See $OUT/current/"
