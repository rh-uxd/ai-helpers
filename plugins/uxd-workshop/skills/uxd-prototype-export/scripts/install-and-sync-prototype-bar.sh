#!/usr/bin/env bash
# Unified Prototype Bar install: sync config + install assets in one shot.
#
# Combines sync-prototype-bar-config.mjs (generates prototype-bar.json from
# metadata/scenarios) with install-prototype-bar.sh (copies assets, mounts
# component or injects into HTML). Run this single command instead of calling
# both scripts separately.
#
# Usage:
#   bash install-and-sync-prototype-bar.sh \
#     --artifacts ".artifacts/{ID}" \
#     --source "<workspace-or-prototype-dir>" \
#     [--mode standalone|workspace] \
#     [--prototype-url URL] \
#     [--jira-base URL]
#
# The script:
#   1. Runs sync-prototype-bar-config.mjs to generate/refresh prototype-bar.json
#   2. Runs install-prototype-bar.sh to copy assets and mount the bar
#   3. Reports success/failure
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ARTIFACTS=""
SOURCE=""
MODE=""
PROTOTYPE_URL=""
JIRA_BASE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifacts) ARTIFACTS="${2:-}"; shift 2 ;;
    --source) SOURCE="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --prototype-url) PROTOTYPE_URL="${2:-}"; shift 2 ;;
    --jira-base) JIRA_BASE="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: bash install-and-sync-prototype-bar.sh --artifacts <dir> --source <dir> [--mode standalone|workspace] [--prototype-url URL] [--jira-base URL]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ARTIFACTS" ]]; then
  echo "Error: --artifacts is required (e.g. .artifacts/PROJ-298)" >&2
  exit 1
fi

if [[ -z "$SOURCE" ]]; then
  echo "Error: --source is required (workspace root or prototype dir)" >&2
  exit 1
fi

# ── Step 1: Sync config ──────────────────────────────────────────────────────
echo "── Step 1: Syncing prototype-bar.json from metadata..."

SYNC_ARGS=("--artifacts" "$ARTIFACTS")
if [[ -n "$PROTOTYPE_URL" ]]; then
  SYNC_ARGS+=("--prototype-url" "$PROTOTYPE_URL")
fi
if [[ -n "$JIRA_BASE" ]]; then
  SYNC_ARGS+=("--jira-base" "$JIRA_BASE")
fi

node "$SCRIPT_DIR/sync-prototype-bar-config.mjs" "${SYNC_ARGS[@]}"

CONFIG="$ARTIFACTS/prototype-bar.json"
if [[ ! -f "$CONFIG" ]]; then
  echo "Error: sync did not produce $CONFIG" >&2
  exit 1
fi

# ── Step 2: Install assets ───────────────────────────────────────────────────
echo ""
echo "── Step 2: Installing Prototype Bar assets..."

INSTALL_ARGS=("--source" "$SOURCE" "--config" "$CONFIG")
if [[ -n "$MODE" ]]; then
  INSTALL_ARGS+=("--mode" "$MODE")
fi

bash "$SCRIPT_DIR/install-prototype-bar.sh" "${INSTALL_ARGS[@]}"

echo ""
echo "── Done. Prototype Bar synced and installed."
