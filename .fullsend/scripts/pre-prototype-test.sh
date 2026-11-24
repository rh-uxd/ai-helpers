#!/usr/bin/env bash
# pre-prototype-test.sh — Tests for the prototype preflight gate.
#
# Validates that pre-prototype.sh correctly classifies issues into
# reject / basic / full tiers based on extractable content.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRE_SCRIPT="${SCRIPT_DIR}/pre-prototype.sh"
PASS=0
FAIL=0

_run_test() {
  local name="$1"
  local expected_exit="$2"
  local expected_pattern="$3"
  shift 3

  echo "--- Test: ${name} ---"

  # Capture output and exit code
  set +e
  OUTPUT=$(env "$@" bash "${PRE_SCRIPT}" 2>&1)
  EXIT_CODE=$?
  set -e

  # Check exit code
  if [[ "${EXIT_CODE}" -ne "${expected_exit}" ]]; then
    echo "  FAIL: expected exit ${expected_exit}, got ${EXIT_CODE}"
    echo "  Output: ${OUTPUT}"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check output pattern
  if [[ -n "${expected_pattern}" ]] && ! echo "${OUTPUT}" | grep -qi "${expected_pattern}"; then
    echo "  FAIL: output missing pattern '${expected_pattern}'"
    echo "  Output: ${OUTPUT}"
    FAIL=$((FAIL + 1))
    return
  fi

  echo "  PASS"
  PASS=$((PASS + 1))
}

# --- Mock gh and curl for testing ---

# Create a temp dir for mock commands
MOCK_DIR=$(mktemp -d)
trap 'rm -rf "${MOCK_DIR}"' EXIT

# Mock gh that returns configurable issue JSON
cat > "${MOCK_DIR}/gh" << 'MOCK_GH'
#!/usr/bin/env bash
# Mock gh — returns issue JSON based on MOCK_ISSUE_FILE env var
if [[ "$1" == "api" && "$2" == repos/*/issues/* && "$3" != *"/comments"* && "$3" != *"/labels/"* ]]; then
  if [[ -n "${MOCK_ISSUE_FILE:-}" && -f "${MOCK_ISSUE_FILE}" ]]; then
    cat "${MOCK_ISSUE_FILE}"
    exit 0
  fi
  echo '{"title":"","body":"","labels":[]}'
  exit 0
fi
# For comment posting / label deletion, succeed silently
exit 0
MOCK_GH
chmod +x "${MOCK_DIR}/gh"

# Mock curl for Jira (not used in GitHub tests)
cat > "${MOCK_DIR}/curl" << 'MOCK_CURL'
#!/usr/bin/env bash
if [[ -n "${MOCK_ISSUE_FILE:-}" && -f "${MOCK_ISSUE_FILE}" ]]; then
  cat "${MOCK_ISSUE_FILE}"
  exit 0
fi
exit 1
MOCK_CURL
chmod +x "${MOCK_DIR}/curl"

export PATH="${MOCK_DIR}:${PATH}"

# --- Test fixtures ---

# Sufficient GitHub issue (all 3 core signals + AC)
SUFFICIENT_ISSUE="${MOCK_DIR}/issue-sufficient.json"
cat > "${SUFFICIENT_ISSUE}" << 'FIXTURE'
{
  "title": "Pod Management page for OpenShift",
  "body": "As a cluster administrator, I need a Pod Management page in the OpenShift console where I can view, filter, and monitor all pods running across my namespaces. The page should follow the standard OpenShift console layout with a persistent left navigation sidebar, a page header showing the current context, and a paginated data table as the primary content area. The left navigation should include links to other resource pages (Deployments, Services, Routes, ConfigMaps) that load with placeholder content. The home page table should display pod metadata including name, namespace, status, restarts, CPU and memory usage, node assignment, and age.\n\n## Acceptance Criteria\n- [ ] Page uses PatternFly Page layout\n- [ ] Table uses @patternfly/react-table\n- [ ] Pagination component below the table",
  "labels": [{"name": "ready-to-prototype"}]
}
FIXTURE

# Thin issue (only title, no real description)
THIN_ISSUE="${MOCK_DIR}/issue-thin.json"
cat > "${THIN_ISSUE}" << 'FIXTURE'
{
  "title": "Add settings page",
  "body": "We need a settings page.",
  "labels": [{"name": "ready-to-prototype"}]
}
FIXTURE

# Description but no flows or entities
NO_FLOWS_ISSUE="${MOCK_DIR}/issue-noflows.json"
cat > "${NO_FLOWS_ISSUE}" << 'FIXTURE'
{
  "title": "Improve the user experience",
  "body": "The current experience is not good enough. We need to make it better for our users. There are many things that could be improved and we should consider all of the options available to us. This is important for the next release and we need to prioritize it. The team has discussed this at length and everyone agrees something needs to change. We have received feedback from multiple sources indicating dissatisfaction.",
  "labels": [{"name": "ready-to-prototype"}]
}
FIXTURE

# API-only issue
API_ONLY_ISSUE="${MOCK_DIR}/issue-apionly.json"
cat > "${API_ONLY_ISSUE}" << 'FIXTURE'
{
  "title": "Add REST endpoint for batch pod deletion",
  "body": "API-only change: add a new REST endpoint DELETE /api/v1/pods/batch that accepts a list of pod names and deletes them in parallel. No UI changes needed. This is a backend-only feature for the CLI and automation tools. The endpoint should return a 207 multi-status response with per-pod results.",
  "labels": [{"name": "ready-to-prototype"}]
}
FIXTURE

# Sufficient but no AC (has flows + entities, just no checkboxes)
NO_AC_ISSUE="${MOCK_DIR}/issue-noac.json"
cat > "${NO_AC_ISSUE}" << 'FIXTURE'
{
  "title": "Namespace quota dashboard",
  "body": "Cluster admins need to view and manage resource quotas across namespaces. They should be able to navigate to a dashboard that shows CPU and memory usage per namespace, with the ability to edit quota limits inline. The page should have a table of namespaces with sortable columns for name, CPU used, CPU limit, memory used, and memory limit. Admins can click a namespace to see detailed resource breakdown. When a namespace is over quota, it should display a warning badge.",
  "labels": [{"name": "ready-to-prototype"}]
}
FIXTURE

# --- Run tests ---

echo "=== pre-prototype.sh tests ==="
echo ""

_run_test "Sufficient issue passes preflight" \
  0 "PREFLIGHT PASSED" \
  MOCK_ISSUE_FILE="${SUFFICIENT_ISSUE}" \
  REPO_FULL_NAME="jpuzz0/ai-helpers" \
  ISSUE_NUMBER="1" \
  GH_TOKEN="mock-token"

_run_test "Thin issue rejected" \
  1 "PREFLIGHT REJECTED" \
  MOCK_ISSUE_FILE="${THIN_ISSUE}" \
  REPO_FULL_NAME="jpuzz0/ai-helpers" \
  ISSUE_NUMBER="2" \
  GH_TOKEN="mock-token"

_run_test "Wordy but vague issue passes at basic tier (has word count + entities, no flows)" \
  0 "tier: basic" \
  MOCK_ISSUE_FILE="${NO_FLOWS_ISSUE}" \
  REPO_FULL_NAME="jpuzz0/ai-helpers" \
  ISSUE_NUMBER="3" \
  GH_TOKEN="mock-token"

_run_test "API-only issue rejected" \
  1 "API-only" \
  MOCK_ISSUE_FILE="${API_ONLY_ISSUE}" \
  REPO_FULL_NAME="jpuzz0/ai-helpers" \
  ISSUE_NUMBER="4" \
  GH_TOKEN="mock-token"

_run_test "No AC but good description passes" \
  0 "PREFLIGHT PASSED" \
  MOCK_ISSUE_FILE="${NO_AC_ISSUE}" \
  REPO_FULL_NAME="jpuzz0/ai-helpers" \
  ISSUE_NUMBER="5" \
  GH_TOKEN="mock-token"

_run_test "Missing REPO_FULL_NAME fails" \
  1 "REPO_FULL_NAME must be set" \
  ISSUE_NUMBER="1" \
  GH_TOKEN="mock-token"

_run_test "Missing ISSUE_NUMBER fails" \
  1 "ISSUE_NUMBER must be set" \
  REPO_FULL_NAME="jpuzz0/ai-helpers" \
  GH_TOKEN="mock-token"

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]] || exit 1
