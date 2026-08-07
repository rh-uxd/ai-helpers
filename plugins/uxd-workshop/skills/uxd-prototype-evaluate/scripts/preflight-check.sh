#!/usr/bin/env bash
# preflight-check.sh — Validates all prerequisites before running the eval pipeline.
# Called at pipeline start. Exits non-zero if any required check fails.
#
# Usage: bash ${CLAUDE_SKILL_DIR}/scripts/preflight-check.sh [--quiet]

set -euo pipefail

QUIET="${1:-}"
PASS=0
FAIL=0
WARN=0

check_pass() {
  PASS=$((PASS + 1))
  [ "${QUIET}" != "--quiet" ] && echo "  [PASS] $1"
}

check_fail() {
  FAIL=$((FAIL + 1))
  echo "  [FAIL] $1"
  echo "         $2"
}

check_warn() {
  WARN=$((WARN + 1))
  [ "${QUIET}" != "--quiet" ] && echo "  [WARN] $1"
}

echo "Eval Pipeline Preflight Check"
echo "────────────────────────────────────────"

# ── Node.js >= 18 ─────────────────────────────────────────────────────
if command -v node > /dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "${NODE_VERSION}" -ge 18 ]; then
    check_pass "Node.js v$(node -v | sed 's/v//')"
  else
    check_fail "Node.js >= 18 required" "Found v$(node -v | sed 's/v//'), upgrade with nvm or brew"
  fi
else
  check_fail "Node.js not found" "Install via: brew install node OR nvm install 18"
fi

# ── Python 3 ──────────────────────────────────────────────────────────
if command -v python3 > /dev/null 2>&1; then
  check_pass "Python 3 ($(python3 --version 2>&1 | awk '{print $2}'))"
else
  check_fail "Python 3 not found" "Install via: brew install python3"
fi

# ── Atlassian MCP ─────────────────────────────────────────────────────
# Test by checking if the MCP tool is callable (agent context)
if [ -n "${MCP_ATLASSIAN_AVAILABLE:-}" ]; then
  check_pass "Atlassian MCP configured"
else
  # Fallback: check if jira CLI or config exists
  if [ -f "${HOME}/.atlassian-mcp.json" ] || [ -f "${HOME}/.config/atlassian-mcp/config.json" ]; then
    check_pass "Atlassian MCP config found"
  else
    check_fail "Atlassian MCP not configured" \
      "Required for Jira ticket extraction. Configure the Atlassian MCP server in your IDE."
  fi
fi

# ── Consistency checker repo ──────────────────────────────────────────
CONSISTENCY_URL="${CONSISTENCY_CHECKER_REPO:-git@gitlab.cee.redhat.com:bmorley/consistency-checker.git}"
if timeout 10 git ls-remote --exit-code "${CONSISTENCY_URL}" HEAD > /dev/null 2>&1; then
  check_pass "Consistency checker repo reachable"
else
  check_warn "Consistency checker repo unreachable — VPN connected? (${CONSISTENCY_URL})"
fi

# ── Playwright ────────────────────────────────────────────────────────
if npx playwright --version > /dev/null 2>&1; then
  check_pass "Playwright ($(npx playwright --version 2>&1))"
else
  check_warn "Playwright not installed (will auto-install on first run)"
fi

# ── Write access to .artifacts/ ───────────────────────────────────────
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ARTIFACTS_DIR="${PROJECT_ROOT}/.artifacts"
if mkdir -p "${ARTIFACTS_DIR}" 2>/dev/null && [ -w "${ARTIFACTS_DIR}" ]; then
  check_pass "Write access to .artifacts/"
else
  check_fail "Cannot write to .artifacts/" "Check directory permissions: ${ARTIFACTS_DIR}"
fi

# ── Summary ───────────────────────────────────────────────────────────
echo "────────────────────────────────────────"
echo "Results: ${PASS} pass, ${FAIL} fail, ${WARN} warn"

if [ "${FAIL}" -gt 0 ]; then
  echo ""
  echo "Pipeline cannot start. Fix the failures above."
  exit 1
fi

echo "All checks passed. Pipeline ready."
exit 0
