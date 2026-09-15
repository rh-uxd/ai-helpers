#!/usr/bin/env bash
#
# Export Figma frames as PNG images via the REST API.
#
# Usage:
#   bash export-figma-frames.sh <FILE_KEY> <NODE_IDS> [SCALE] [FORMAT]
#
# Arguments:
#   FILE_KEY  - Figma file key (from the URL)
#   NODE_IDS  - Comma-separated node IDs using : format (e.g., "16:1047,16:1048")
#   SCALE     - Export scale 0.01-4 (default: 2)
#   FORMAT    - png, jpg, svg, or pdf (default: png)
#
# Environment:
#   FIGMA_PAT - Figma Personal Access Token (required)
#
# Output:
#   Downloads images to current directory as figma-<nodeId>.<format>

set -euo pipefail

FILE_KEY="${1:?Usage: export-figma-frames.sh <FILE_KEY> <NODE_IDS> [SCALE] [FORMAT]}"
NODE_IDS="${2:?Usage: export-figma-frames.sh <FILE_KEY> <NODE_IDS> [SCALE] [FORMAT]}"
SCALE="${3:-2}"
FORMAT="${4:-png}"

if [ -z "${FIGMA_PAT:-}" ]; then
  echo "ERROR: Set FIGMA_PAT to your Figma personal access token." >&2
  echo "Create one at https://www.figma.com/developers/apps" >&2
  exit 1
fi

command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: python3 is required for JSON parsing and image download." >&2
  exit 1
}

API_URL="https://api.figma.com/v1/images/${FILE_KEY}?ids=${NODE_IDS}&format=${FORMAT}&scale=${SCALE}"

echo "Exporting frames from Figma..."
echo "  File key: ${FILE_KEY}"
echo "  Node IDs: ${NODE_IDS}"
echo "  Format:   ${FORMAT} @ ${SCALE}x"

RESPONSE=$(curl -sf -H "X-Figma-Token: ${FIGMA_PAT}" "${API_URL}" 2>&1) || {
  echo "ERROR: Figma API request failed." >&2
  echo "${RESPONSE}" >&2
  exit 1
}

echo "${RESPONSE}" | python3 -c "
import json, sys, urllib.request, os

data = json.load(sys.stdin)

if 'err' in data and data['err']:
    print(f\"ERROR: Figma API returned error: {data['err']}\", file=sys.stderr)
    sys.exit(1)

images = data.get('images', {})
if not images:
    print('No images returned. Check that node IDs are correct.', file=sys.stderr)
    sys.exit(1)

downloaded = 0
for node_id, url in images.items():
    if url:
        fname = f'figma-{node_id.replace(\":\", \"-\")}.${FORMAT}'
        urllib.request.urlretrieve(url, fname)
        print(f'  Downloaded: {fname}')
        downloaded += 1
    else:
        print(f'  Skipped {node_id}: node is invisible or has 0% opacity', file=sys.stderr)

print(f'\nExported {downloaded}/{len(images)} frames.')
"
