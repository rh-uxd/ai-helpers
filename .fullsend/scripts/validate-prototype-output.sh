#!/usr/bin/env bash
# validate-prototype-output.sh — Validate prototype agent output against
# the prototype-result JSON Schema.
#
# Required env vars:
#   FULLSEND_OUTPUT_SCHEMA — path to the JSON Schema file (set by harness)
#
# The working directory is the iteration dir (set by run.go).

set -euo pipefail

: "${FULLSEND_OUTPUT_SCHEMA:?FULLSEND_OUTPUT_SCHEMA must be set}"

OUTPUT_DIR="output"
if [[ ! -d "${OUTPUT_DIR}" ]]; then
  echo "FAIL: output directory not found"
  exit 1
fi

RESULT_FILE="${OUTPUT_DIR}/agent-result.json"
if [[ ! -f "${RESULT_FILE}" ]]; then
  echo "FAIL: ${RESULT_FILE} not found"
  exit 1
fi
echo "Validating: ${RESULT_FILE} against ${FULLSEND_OUTPUT_SCHEMA}"

if ! python3 -m json.tool "${RESULT_FILE}" > /dev/null 2>&1; then
  echo "FAIL: ${RESULT_FILE} is not valid JSON"
  exit 1
fi

# Pass file paths via env vars to avoid shell injection in Python strings.
export VALIDATE_RESULT_FILE="${RESULT_FILE}"
export VALIDATE_SCHEMA_FILE="${FULLSEND_OUTPUT_SCHEMA}"

if ! python3 << 'PYEOF'
import json, jsonschema, sys, os

result_path = os.environ["VALIDATE_RESULT_FILE"]
schema_path = os.environ["VALIDATE_SCHEMA_FILE"]

with open(result_path) as f:
    data = json.load(f)
with open(schema_path) as f:
    schema = json.load(f)
try:
    jsonschema.validate(data, schema)
    print("OK: schema validation passed")
except jsonschema.ValidationError as e:
    print(f"FAIL: {e.message}")
    sys.exit(1)
PYEOF
then
  exit 1
fi
