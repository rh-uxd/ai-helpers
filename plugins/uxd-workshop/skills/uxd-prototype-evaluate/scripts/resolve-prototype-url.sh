#!/usr/bin/env bash
# resolve-prototype-url.sh — Determines the testable prototype URL for Playwright.
#
# Handles three source types:
#   1. Remote (GitLab Pages MR) — probe URL, use directly if reachable
#   2. Local SPA build (dist/) — serve with sirv --single for client-side routing
#   3. Local static build (dist/) — serve with sirv (no SPA fallback)
#   [Future] HTML prototype from uxd-prototype-create — standalone HTML file
#
# Usage:
#   bash resolve-prototype-url.sh <URL> <WORKSPACE> <ARTIFACTS_DIR> [PORT]
#
# Outputs (stdout, one per line):
#   RESOLVED_URL=<url>
#   SERVER_PID=<pid>       (only if local server started)
#   SERVER_TYPE=<remote|spa|static>
#
# Exit codes:
#   0 — resolved successfully
#   1 — unrecoverable failure (no URL reachable, no local fallback)

set -euo pipefail

URL="${1:?Usage: resolve-prototype-url.sh <URL> <WORKSPACE> <ARTIFACTS_DIR> [PORT]}"
WORKSPACE="${2:-}"
ARTIFACTS_DIR="${3:-}"
PORT="${4:-9000}"
MAX_PORT_ATTEMPTS=3

# ── URL reachability probe ────────────────────────────────────────────────────

probe_url() {
  local url="$1"
  local status
  status=$(curl --max-time 10 -o /dev/null -s -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  case "$status" in
    2*|3*) return 0 ;;
    *) return 1 ;;
  esac
}

# ── SPA detection ─────────────────────────────────────────────────────────────
# Returns 0 if the index.html indicates a single-page application.

detect_spa() {
  local index_html="$1"
  [ -f "$index_html" ] || return 1

  if grep -qE '<div id="(root|app|__next)">' "$index_html" 2>/dev/null; then
    return 0
  fi
  if grep -q '<base href' "$index_html" 2>/dev/null; then
    return 0
  fi
  if grep -qE 'src="/' "$index_html" 2>/dev/null; then
    return 0
  fi
  # Angular: look for <app-root> custom element
  if grep -q '<app-root' "$index_html" 2>/dev/null; then
    return 0
  fi
  return 1
}

# ── Find serveable directory ──────────────────────────────────────────────────
# Checks common build output directories in priority order.

find_dist_dir() {
  local ws="$1"
  for dir in dist build public out; do
    if [ -d "${ws}/${dir}" ] && [ -f "${ws}/${dir}/index.html" ]; then
      echo "${ws}/${dir}"
      return 0
    fi
  done
  # Future: standalone HTML from prototype-create
  # if [ -f "${ws}/index.html" ]; then
  #   echo "${ws}"
  #   return 0
  # fi
  return 1
}

# ── Find available port ───────────────────────────────────────────────────────

find_open_port() {
  local port="$1"
  local attempts=0
  while [ $attempts -lt $MAX_PORT_ATTEMPTS ]; do
    if ! lsof -ti:"$port" > /dev/null 2>&1; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
    attempts=$((attempts + 1))
  done
  return 1
}

# ── Start local server ────────────────────────────────────────────────────────

start_server() {
  local serve_dir="$1"
  local spa_flag="$2"
  local port="$3"
  local pid_file="${ARTIFACTS_DIR}/server.pid"

  local cmd="npx sirv ${serve_dir} --port ${port} --host 0.0.0.0"
  if [ "$spa_flag" = "true" ]; then
    cmd="${cmd} --single"
  fi

  nohup bash -c "$cmd" > /dev/null 2>&1 &
  local server_pid=$!
  disown $server_pid 2>/dev/null || true

  # Write PID for cleanup
  if [ -n "$ARTIFACTS_DIR" ]; then
    echo "$server_pid" > "$pid_file"
  fi

  # Wait for server to be ready (up to 5 seconds)
  local waited=0
  while [ $waited -lt 5 ]; do
    if curl -s -o /dev/null "http://localhost:${port}" 2>/dev/null; then
      echo "$server_pid"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  # Check if process is still alive
  if kill -0 "$server_pid" 2>/dev/null; then
    echo "$server_pid"
    return 0
  fi

  echo "ERROR: Server failed to start on port ${port}" >&2
  return 1
}

# ══════════════════════════════════════════════════════════════════════════════
# Main resolution logic
# ══════════════════════════════════════════════════════════════════════════════

# ── SPA path-prefix detection ─────────────────────────────────────────────────
# A remote URL like https://pages.example.com/mr-174/ serves from a sub-path.
# SPAs with <base href="/"> or absolute route config break under path prefixes
# because React Router sees /mr-174/route but expects /route.
# When workspace is available, prefer local serving for path-prefixed SPAs.

url_has_path_prefix() {
  local url="$1"
  local path
  path=$(echo "$url" | sed -E 's|https?://[^/]+||' | sed 's|/$||')
  [ -n "$path" ] && [ "$path" != "" ]
}

remote_is_spa_with_root_base() {
  local url="$1"
  local html
  html=$(curl --max-time 10 -s "$url" 2>/dev/null)
  [ -z "$html" ] && return 1
  echo "$html" | grep -q '<base href="/"' && return 0
  echo "$html" | grep -qE '<div id="(root|app|__next)">' && return 0
  return 1
}

# Case 1: Remote URL is reachable
if probe_url "$URL"; then
  # Check for path-prefix + SPA conflict: prefer local when workspace available
  if url_has_path_prefix "$URL" && remote_is_spa_with_root_base "$URL" && [ -n "$WORKSPACE" ] && [ -d "$WORKSPACE" ]; then
    echo "INFO: Remote URL reachable but serves SPA from path prefix — local serving preferred for route matching" >&2
    # Fall through to local serving below
  else
    echo "RESOLVED_URL=${URL}"
    echo "SERVER_PID="
    echo "SERVER_TYPE=remote"
    exit 0
  fi
else
  echo "INFO: URL unreachable (${URL}), attempting local fallback..." >&2
fi

# Case 2/3: Fall back to local serving
if [ -z "$WORKSPACE" ] || [ ! -d "$WORKSPACE" ]; then
  echo "ERROR: Prototype URL unreachable and no --workspace provided for local fallback" >&2
  echo "  URL: ${URL}" >&2
  echo "  Fix: Provide --workspace=/path/to/prototype or ensure the URL is accessible" >&2
  exit 1
fi

DIST_DIR=$(find_dist_dir "$WORKSPACE") || {
  echo "ERROR: No serveable prototype found in workspace." >&2
  echo "  Checked: dist/, build/, public/, out/ (each needing index.html)" >&2
  echo "  Fix: Run 'npm run build' first, or provide a direct reachable URL" >&2
  exit 1
}

ACTUAL_PORT=$(find_open_port "$PORT") || {
  echo "ERROR: Ports ${PORT}-$((PORT + MAX_PORT_ATTEMPTS - 1)) all in use" >&2
  exit 1
}

# Detect SPA vs static
SPA="false"
SERVER_TYPE="static"
if detect_spa "${DIST_DIR}/index.html"; then
  SPA="true"
  SERVER_TYPE="spa"
fi

SERVER_PID=$(start_server "$DIST_DIR" "$SPA" "$ACTUAL_PORT") || exit 1

RESOLVED="http://localhost:${ACTUAL_PORT}"

# Verify the resolved URL actually serves content
if ! probe_url "$RESOLVED"; then
  echo "ERROR: Local server started but not responding at ${RESOLVED}" >&2
  kill "$SERVER_PID" 2>/dev/null || true
  exit 1
fi

echo "RESOLVED_URL=${RESOLVED}"
echo "SERVER_PID=${SERVER_PID}"
echo "SERVER_TYPE=${SERVER_TYPE}"

if [ "$SPA" = "true" ]; then
  echo "INFO: SPA detected — serving with --single (client-side routes fall back to index.html)" >&2
else
  echo "INFO: Static site — serving without SPA fallback" >&2
fi

exit 0
