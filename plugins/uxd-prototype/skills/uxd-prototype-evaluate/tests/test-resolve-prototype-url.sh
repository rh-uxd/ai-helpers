#!/usr/bin/env bash
set -euo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$TEST_DIR/.." && pwd)"
RESOLVER="$SKILL_DIR/scripts/evidence/resolve-prototype-url.sh"
TMP_BASE="${TMPDIR:-/tmp}"
TEST_ROOT="$(mktemp -d "${TMP_BASE%/}/resolve-prototype-url.XXXXXX")"
STUB_BIN="$TEST_ROOT/bin"
PID_DIR="$TEST_ROOT/npx-pids"
mkdir -p "$STUB_BIN" "$PID_DIR"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cleanup() {
  local pid_file pid command
  for pid_file in "$PID_DIR"/*; do
    [ -f "$pid_file" ] || continue
    IFS= read -r pid < "$pid_file" || continue
    case "$pid" in
      ''|*[!0-9]*) continue ;;
    esac
    if kill -0 "$pid" 2>/dev/null; then
      command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
      case "$command" in
        *"$STUB_BIN/npx"*) kill "$pid" 2>/dev/null || true ;;
      esac
    fi
  done
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cat > "$STUB_BIN/curl" <<'STUB'
#!/usr/bin/env bash
last_arg=""
has_writeout=false
for arg in "$@"; do
  last_arg="$arg"
  if [ "$arg" = "%{http_code}" ]; then
    has_writeout=true
  fi
done

case "$last_arg" in
  http://localhost:*)
    if [ "$has_writeout" = true ]; then
      printf '200'
    fi
    exit 0
    ;;
  *)
    if [ "$has_writeout" = true ]; then
      printf '000'
    fi
    exit 0
    ;;
esac
STUB

cat > "$STUB_BIN/lsof" <<'STUB'
#!/usr/bin/env bash
port=""
for arg in "$@"; do
  case "$arg" in
    -ti:*) port="${arg#-ti:}" ;;
  esac
done
printf '%s\n' "$port" >> "$LSOF_LOG"

case ",${PORTS_IN_USE:-}," in
  *,"$port",*) exit 0 ;;
  *) exit 1 ;;
esac
STUB

cat > "$STUB_BIN/npx" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$NPX_ARGS_FILE"
printf '%s\n' "$$" > "$NPX_PID_FILE"
exit 0
STUB

chmod +x "$STUB_BIN/curl" "$STUB_BIN/lsof" "$STUB_BIN/npx"
export PATH="$STUB_BIN:$PATH"

setup_case() {
  local name="$1"
  CASE_DIR="$TEST_ROOT/$name"
  WORKSPACE="$2"
  PORT_VALUE="$3"
  PORTS_IN_USE="${4:-}"
  ARTIFACTS_DIR="$CASE_DIR/artifacts"
  NPX_ARGS_FILE="$CASE_DIR/npx-args"
  NPX_PID_FILE="$PID_DIR/$name"
  LSOF_LOG="$CASE_DIR/lsof-ports"

  mkdir -p "$CASE_DIR/$WORKSPACE/dist" "$ARTIFACTS_DIR"
  : > "$CASE_DIR/$WORKSPACE/dist/index.html"
  export PORTS_IN_USE ARTIFACTS_DIR NPX_ARGS_FILE NPX_PID_FILE LSOF_LOG
}

write_index() {
  printf '%s\n' "$1" > "$CASE_DIR/$WORKSPACE/dist/index.html"
}

run_resolver() (
  cd "$CASE_DIR"
  bash "$RESOLVER" "https://offline.invalid/" "$WORKSPACE" "$ARTIFACTS_DIR" "$PORT_VALUE"
)

run_success() {
  if OUTPUT="$(run_resolver 2>&1)"; then
    :
  else
    fail "resolver unexpectedly failed for $CASE_DIR: $OUTPUT"
  fi
}

run_failure() {
  if OUTPUT="$(run_resolver 2>&1)"; then
    fail "resolver unexpectedly succeeded for $CASE_DIR: $OUTPUT"
  fi
}

assert_output_has() {
  case "$OUTPUT" in
    *"$1"*) ;;
    *) fail "expected output to contain '$1'; got: $OUTPUT" ;;
  esac
}

wait_for_npx_exit() {
  local pid command attempt
  for (( attempt = 0; attempt < 100; attempt++ )); do
    [ -s "$NPX_PID_FILE" ] && break
    sleep 0.01
  done
  [ -s "$NPX_PID_FILE" ] || fail "fake npx was not invoked"
  IFS= read -r pid < "$NPX_PID_FILE" || fail "could not read fake npx PID"

  for (( attempt = 0; attempt < 100; attempt++ )); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
    case "$command" in
      *"$STUB_BIN/npx"*) sleep 0.01 ;;
      *) return 0 ;;
    esac
  done

  fail "fake npx process did not exit"
}

assert_result() {
  local resolved_port="$1"
  local server_type="$2"
  local pid

  assert_output_has "RESOLVED_URL=http://localhost:${resolved_port}"
  assert_output_has "SERVER_TYPE=${server_type}"
  [ -s "$ARTIFACTS_DIR/server.pid" ] || fail "server PID file was not written"
  IFS= read -r pid < "$ARTIFACTS_DIR/server.pid" || fail "could not read server PID"
  case "$pid" in
    ''|*[!0-9]*) fail "server PID is not numeric: $pid" ;;
  esac
  printf '%s\n' "$OUTPUT" | grep -Fxq "SERVER_PID=$pid" || fail "emitted server PID does not match server.pid"
}

assert_npx_args() {
  local serve_dir="$1"
  local port="$2"
  local spa="$3"
  local expected="$CASE_DIR/expected-npx-args"

  wait_for_npx_exit
  [ -f "$NPX_ARGS_FILE" ] || fail "fake npx did not record its arguments"

  {
    printf '%s\n' sirv
    printf '%s\n' "$serve_dir"
    printf '%s\n' --port
    printf '%s\n' "$port"
    printf '%s\n' --host
    printf '%s\n' 0.0.0.0
    if [ "$spa" = true ]; then
      printf '%s\n' --single
    fi
  } > "$expected"

  if ! cmp -s "$expected" "$NPX_ARGS_FILE"; then
    diff -u "$expected" "$NPX_ARGS_FILE" >&2 || true
    fail "fake npx received unexpected arguments"
  fi
}

assert_lsof_ports() {
  local expected="$CASE_DIR/expected-lsof-ports"
  printf '%s\n' "$@" > "$expected"
  if ! cmp -s "$expected" "$LSOF_LOG"; then
    diff -u "$expected" "$LSOF_LOG" >&2 || true
    fail "lsof was called with unexpected candidate ports"
  fi
}

assert_no_server_start() {
  [ ! -e "$NPX_ARGS_FILE" ] || fail "npx was invoked for a rejected port"
  [ ! -e "$ARTIFACTS_DIR/server.pid" ] || fail "PID file exists after rejected port"
}

# Static builds keep the default port and do not request SPA fallback.
setup_case static static 9000
write_index '<html><body>static</body></html>'
run_success
assert_result 9000 static
assert_npx_args "$WORKSPACE/dist" 9000 false
assert_lsof_ports 9000
echo 'PASS: static invocation and default port'

# SPA detection appends --single as a distinct argument.
setup_case spa spa 9001
write_index '<html><div id="root"></div></html>'
run_success
assert_result 9001 spa
assert_npx_args "$WORKSPACE/dist" 9001 true
echo 'PASS: SPA invocation includes --single'

# Leading zeroes are decimal-normalized before probing and invocation.
setup_case leading-zero leading 00080
write_index '<html></html>'
run_success
assert_result 80 static
assert_npx_args "$WORKSPACE/dist" 80 false
assert_lsof_ports 80
echo 'PASS: leading-zero port normalizes in base 10'

# A hostile workspace remains one literal argv element; no shell marker is created.
HOSTILE_WORKSPACE='workspace with spaces; touch injected-path-marker; #'
setup_case hostile-path "$HOSTILE_WORKSPACE" 9010
write_index '<html></html>'
run_success
assert_result 9010 static
assert_npx_args "$WORKSPACE/dist" 9010 false
[ ! -e "$CASE_DIR/injected-path-marker" ] || fail "hostile workspace path executed shell syntax"
echo 'PASS: hostile workspace path is literal and inert'

# Port input is rejected before lsof/npx, including shell syntax and huge numbers.
invalid_ports=(
  0
  00000
  65536
  999999999999999999999999999999999999999999999999
  '80; touch injected-port-marker; #'
)
invalid_index=0
for invalid_port in "${invalid_ports[@]}"; do
  invalid_index=$((invalid_index + 1))
  setup_case "invalid-port-$invalid_index" invalid 9000
  PORT_VALUE="$invalid_port"
  run_failure
  assert_output_has 'Port must be a decimal integer from 1 to 65535'
  assert_no_server_start
  [ ! -e "$LSOF_LOG" ] || [ ! -s "$LSOF_LOG" ] || fail "lsof ran before invalid port was rejected"
  [ ! -e "$CASE_DIR/injected-port-marker" ] || fail "invalid port executed shell syntax"
done
echo 'PASS: invalid, huge, zero, out-of-range, and hostile ports are rejected before probing'

# A busy start port advances through at most three valid candidates.
setup_case occupied-fallback occupied 9100 '9100,9101'
write_index '<html></html>'
run_success
assert_result 9102 static
assert_npx_args "$WORKSPACE/dist" 9102 false
assert_lsof_ports 9100 9101 9102
echo 'PASS: occupied ports advance to the next free candidate'

# Exhaustion fails without launching npx.
setup_case exhausted exhausted 9200 '9200,9201,9202'
write_index '<html></html>'
run_failure
assert_output_has 'Ports 9200-9202 all in use'
assert_lsof_ports 9200 9201 9202
assert_no_server_start
echo 'PASS: three occupied candidates fail without starting npx'

# The top of the TCP port range is inclusive; probing never crosses 65535.
setup_case min-port min-port 1
write_index '<html></html>'
run_success
assert_result 1 static
assert_npx_args "$WORKSPACE/dist" 1 false
assert_lsof_ports 1
echo 'PASS: port 1 is accepted'

setup_case max-port-free max-port-free 65535
write_index '<html></html>'
run_success
assert_result 65535 static
assert_npx_args "$WORKSPACE/dist" 65535 false
assert_lsof_ports 65535
echo 'PASS: port 65535 is accepted when available'

setup_case max-port max-port 65535 65535
write_index '<html></html>'
run_failure
assert_output_has 'Ports 65535-65535 all in use'
assert_lsof_ports 65535
assert_no_server_start
echo 'PASS: candidate search is capped at port 65535'

echo 'All resolver tests passed.'
