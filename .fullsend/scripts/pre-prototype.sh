#!/usr/bin/env bash
# pre-prototype.sh — Preflight context validation for the prototype agent.
#
# Runs on the CI runner BEFORE sandbox creation. Classifies the source
# issue into one of three tiers based on extractable content — not text
# formatting. If the issue lacks the minimum context for Step 4 of
# uxd-prototype-create (user need, flows, entities), it comments with a
# fillable checklist and stops. No sandbox started, no AI tokens burned.
#
# Tiers:
#   REJECT — fewer than 2 of 3 core signals. Comment + stop.  ~$0.00
#   BASIC  — 2 of 3 core signals but no enrichments. Proceed with assumptions flagged.
#   FULL   — 3 core signals + enrichments. Proceed with grounded output.
#
# Supports GitHub and Jira issue sources.
#
# Required env vars:
#   REPO_FULL_NAME — owner/repo slug
#   ISSUE_NUMBER   — GitHub issue number or Jira issue key
#   GH_TOKEN       — GitHub API token (GitHub source)
#
# Optional env vars:
#   FULLSEND_TRACKER — "jira" when source is Jira
#   JIRA_BASE_URL    — Jira instance URL (Jira source)

set -euo pipefail

: "${REPO_FULL_NAME:?REPO_FULL_NAME must be set}"
: "${ISSUE_NUMBER:?ISSUE_NUMBER must be set}"

# Skill's own thin-RFE threshold is 50 words
MIN_DESCRIPTION_WORDS=50

# --- Fetch issue content ---

if [[ "${FULLSEND_TRACKER:-}" == "jira" ]]; then
  : "${JIRA_BASE_URL:?JIRA_BASE_URL must be set for Jira source}"
  : "${JIRA_TOKEN:?JIRA_TOKEN must be set for Jira source}"
  echo "Fetching Jira issue: ${ISSUE_NUMBER}"

  ISSUE_JSON=$(curl -sf \
    -H "Authorization: Bearer ${JIRA_TOKEN}" \
    -H "Content-Type: application/json" \
    "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_NUMBER}?fields=summary,description,labels" 2>/dev/null) || {
    echo "ERROR: Could not fetch Jira issue ${ISSUE_NUMBER}. Cannot validate context."
    exit 1
  }

  TITLE=$(echo "${ISSUE_JSON}" | jq -r '.fields.summary // ""')
  BODY=$(echo "${ISSUE_JSON}" | jq -r '
    .fields.description // {} |
    [.. | .text? // empty] | join(" ")
  ')
  LABELS=$(echo "${ISSUE_JSON}" | jq -r '[.fields.labels[]?.name // empty] | join(",")')
  SOURCE="jira"
else
  echo "Fetching GitHub issue: ${REPO_FULL_NAME}#${ISSUE_NUMBER}"

  ISSUE_JSON=$(GH_TOKEN="${GH_TOKEN}" gh api \
    "repos/${REPO_FULL_NAME}/issues/${ISSUE_NUMBER}" 2>/dev/null) || {
    echo "ERROR: Could not fetch GitHub issue #${ISSUE_NUMBER}. Cannot validate context."
    exit 1
  }

  TITLE=$(echo "${ISSUE_JSON}" | jq -r '.title // ""')
  BODY=$(echo "${ISSUE_JSON}" | jq -r '.body // ""')
  LABELS=$(echo "${ISSUE_JSON}" | jq -r '[.labels[].name] | join(",")')
  SOURCE="github"
fi

FULL_TEXT="${TITLE} ${BODY}"
# Sanitize title for safe echo in GHA (strip :: workflow command sequences)
TITLE_SAFE="${TITLE//::/ }"
echo "Issue title: ${TITLE_SAFE}"

# --- Check for duplicate prototype PR ---

if [[ "${SOURCE}" == "github" ]]; then
  EXISTING_PR=$(GH_TOKEN="${GH_TOKEN}" gh api \
    "repos/${REPO_FULL_NAME}/pulls?state=open&per_page=100" \
    --jq "[.[] | select(.head.ref == \"prototype/${ISSUE_NUMBER}\" or (.head.ref | startswith(\"prototype/${ISSUE_NUMBER}-\")))] | length" \
    2>/dev/null) || {
    echo "WARNING: Could not check for duplicate prototype PRs. Proceeding."
    EXISTING_PR=0
  }

  if [[ "${EXISTING_PR}" -gt 0 ]]; then
    echo "INFO: An open prototype PR already exists for issue #${ISSUE_NUMBER}. Skipping."
    exit 1
  fi
fi

# --- Score: 3 core signals ---
# These map to what uxd-prototype-create Step 4 extracts:
#   user_need — who is this for and what do they need?
#   flows     — at least one describable user action sequence
#   entities  — concrete nouns / objects the user works with

CORE_SCORE=0
MISSING_REQUIRED=()
MISSING_ENRICHMENTS=()

# Signal 1: User need — description has enough substance
WORD_COUNT=$(echo "${BODY}" | wc -w | tr -d ' ')
echo "Description word count: ${WORD_COUNT} (minimum: ${MIN_DESCRIPTION_WORDS})"

if [[ "${WORD_COUNT}" -ge "${MIN_DESCRIPTION_WORDS}" ]]; then
  CORE_SCORE=$((CORE_SCORE + 1))
  echo "  [PASS] User need: description has ${WORD_COUNT} words"
else
  MISSING_REQUIRED+=("**Who is this for?** — Describe the user role and what they need to accomplish (e.g., \"Cluster admins need to manage API keys for service accounts\")")
  echo "  [FAIL] User need: only ${WORD_COUNT} words (need ${MIN_DESCRIPTION_WORDS}+)"
fi

# Signal 2: Flows — action verbs suggesting user workflows
# Look for action patterns: "user can", "click", "navigate", "create", "select",
# "submit", "view", "manage", "configure", "edit", "delete", "add", "remove"
HAS_FLOWS=false
if echo "${FULL_TEXT}" | grep -qiE '(can (create|edit|delete|view|manage|configure|add|remove|update|select|submit|navigate|search|filter|sort|export|import|invite|assign|approve|reject)|steps?:|workflow:|flow:|process:|click|navigate to|go to|open the|select the|fill in|enter the)'; then
  HAS_FLOWS=true
  CORE_SCORE=$((CORE_SCORE + 1))
  echo "  [PASS] Flows: found user action patterns"
else
  MISSING_REQUIRED+=("**What do they need to do?** — Describe at least one user flow in plain language (e.g., \"create a new project, configure settings, invite team members\")")
  echo "  [FAIL] Flows: no user action patterns found"
fi

# Signal 3: Entities — concrete nouns the user works with
# Look for capitalized nouns, quoted terms, or common UI entities
HAS_ENTITIES=false
if echo "${FULL_TEXT}" | grep -qiE '(page|form|table|list|dashboard|settings|modal|dialog|panel|drawer|wizard|sidebar|toolbar|menu|tab|card|button|notification|alert|user|admin|role|permission|project|pipeline|model|cluster|namespace|workbench|notebook|endpoint|deployment|application|service|repository|secret|credential|token|key|certificate)'; then
  HAS_ENTITIES=true
  CORE_SCORE=$((CORE_SCORE + 1))
  echo "  [PASS] Entities: found concrete UI/domain nouns"
else
  MISSING_REQUIRED+=("**What are they working with?** — Name the key objects or entities (e.g., \"projects,\" \"API keys,\" \"user roles,\" \"pipelines\")")
  echo "  [FAIL] Entities: no concrete nouns found"
fi

# --- Check for API-only ticket (no UI component) ---
# uxd-prototype-create flags these as dead ends in autonomous mode

IS_API_ONLY=false
if echo "${FULL_TEXT}" | grep -qiE '(api[- ]only|backend[- ]only|no ui|cli[- ]only|server[- ]side only)' && \
   ! echo "${FULL_TEXT}" | grep -qiE '(page|form|dashboard|modal|dialog|panel|drawer|table|card|wizard|settings|ui|interface|screen|view)'; then
  IS_API_ONLY=true
  echo "  [WARN] API-only: this appears to be a backend-only ticket with no UI component"
fi

# --- Score: enrichments (don't block, but affect tier) ---

HAS_STATE_TRIGGERS=false
if echo "${FULL_TEXT}" | grep -qiE '(empty state|error state|loading|no data|no results|permission denied|unauthorized|forbidden|timeout|offline|empty|skeleton|spinner|zero state)'; then
  HAS_STATE_TRIGGERS=true
  echo "  [ENRICHMENT] State triggers: found edge case / state references"
else
  MISSING_ENRICHMENTS+=("Edge cases — What happens when there's no data? An error? No permission?")
fi

HAS_FIGMA=false
if echo "${FULL_TEXT}" | grep -qiE '(figma\.com|figma link|figma design|design spec|mockup|wireframe)'; then
  HAS_FIGMA=true
  echo "  [ENRICHMENT] Figma: found design reference"
else
  MISSING_ENRICHMENTS+=("Figma link or screenshot — Design reference for layout and components")
fi

HAS_AC=false
if echo "${FULL_TEXT}" | grep -qiE '(acceptance criteria|user stor|as a .+ i want|given .+ when .+ then|\- \[[ x]\]|requirements:)'; then
  HAS_AC=true
  echo "  [ENRICHMENT] Acceptance criteria: found testable conditions"
else
  MISSING_ENRICHMENTS+=("Acceptance criteria — Testable conditions for \"done\"")
fi

# --- Decision ---

echo ""
echo "Core score: ${CORE_SCORE}/3 (user_need, flows, entities)"

# API-only tickets always rejected
if [[ "${IS_API_ONLY}" == "true" ]]; then
  echo "PREFLIGHT REJECTED: This appears to be an API-only ticket with no UI component."
  echo "The prototype agent generates UI prototypes — it cannot prototype backend-only features."

  COMMENT="### Prototype Preflight: Not a UI Feature\n\nThis issue appears to describe a backend/API-only change with no user interface component. The prototype agent generates PatternFly UI prototypes and cannot prototype backend-only features.\n\nIf this issue does have a UI component, add UI-related details (pages, forms, dashboards, user interactions) to the description and re-label \`ready-to-prototype\`.\n\n---\n*This check ran before the prototype agent started — no AI tokens were used.*"

  if [[ "${SOURCE}" == "github" ]]; then
    echo -e "${COMMENT}" | GH_TOKEN="${GH_TOKEN}" gh api \
      "repos/${REPO_FULL_NAME}/issues/${ISSUE_NUMBER}/comments" \
      -f body="$(echo -e "${COMMENT}")" --silent 2>/dev/null || true
    GH_TOKEN="${GH_TOKEN}" gh api \
      "repos/${REPO_FULL_NAME}/issues/${ISSUE_NUMBER}/labels/ready-to-prototype" \
      -X DELETE --silent 2>/dev/null || true
  fi
  exit 1
fi

# Reject: fewer than 2 core signals
if [[ "${CORE_SCORE}" -lt 2 ]]; then
  echo "PREFLIGHT REJECTED: Issue does not have enough extractable content for prototyping."

  COMMENT="### Prototype Preflight: More Context Needed\n\nThis issue doesn't have enough detail for the prototype agent to generate something useful. The agent needs to extract user flows, entities, and page states from the description — without them, it would generate a generic prototype based on assumptions.\n\n**Required** (the agent needs these to build any prototype):\n"
  for item in "${MISSING_REQUIRED[@]}"; do
    COMMENT+="- [ ] ${item}\n"
  done

  if [[ ${#MISSING_ENRICHMENTS[@]} -gt 0 ]]; then
    COMMENT+="\n**Improves quality** (not required, but makes the prototype better):\n"
    for item in "${MISSING_ENRICHMENTS[@]}"; do
      COMMENT+="- [ ] ${item}\n"
    done
  fi

  COMMENT+="\n---\n*This check ran before the prototype agent started — no AI tokens were used. Re-label \`ready-to-prototype\` when updated.*"

  if [[ "${SOURCE}" == "github" ]]; then
    echo ""
    echo "Posting preflight comment on GitHub issue #${ISSUE_NUMBER}..."
    GH_TOKEN="${GH_TOKEN}" gh api \
      "repos/${REPO_FULL_NAME}/issues/${ISSUE_NUMBER}/comments" \
      -f body="$(echo -e "${COMMENT}")" --silent 2>/dev/null || \
      echo "WARNING: Could not post comment on issue."
    GH_TOKEN="${GH_TOKEN}" gh api \
      "repos/${REPO_FULL_NAME}/issues/${ISSUE_NUMBER}/labels/ready-to-prototype" \
      -X DELETE --silent 2>/dev/null || true
  fi

  exit 1
fi

# Determine tier
ENRICHMENT_COUNT=0
[[ "${HAS_STATE_TRIGGERS}" == "true" ]] && ENRICHMENT_COUNT=$((ENRICHMENT_COUNT + 1))
[[ "${HAS_FIGMA}" == "true" ]] && ENRICHMENT_COUNT=$((ENRICHMENT_COUNT + 1))
[[ "${HAS_AC}" == "true" ]] && ENRICHMENT_COUNT=$((ENRICHMENT_COUNT + 1))

if [[ "${CORE_SCORE}" -eq 3 && "${ENRICHMENT_COUNT}" -ge 1 ]]; then
  TIER="full"
else
  TIER="basic"
fi

echo ""
echo "PREFLIGHT PASSED (tier: ${TIER})"
echo "  Title: ${TITLE_SAFE}"
echo "  Description: ${WORD_COUNT} words"
echo "  Core signals: ${CORE_SCORE}/3"
echo "  Enrichments: ${ENRICHMENT_COUNT}/3"

# Export tier for the agent to read
export PROTOTYPE_TIER="${TIER}"
echo "PROTOTYPE_TIER=${TIER}" >> "${GITHUB_ENV:-/dev/null}" 2>/dev/null || true

# Write full issue JSON to a file for the sandbox (mounted via host_files).
# The sandbox reads this file instead of making authenticated API calls.
ISSUE_FILE="${RUNNER_TEMP:-/tmp}/issue-context.json"
echo "${ISSUE_JSON}" > "${ISSUE_FILE}"
echo "  Issue context written to: ${ISSUE_FILE}"
