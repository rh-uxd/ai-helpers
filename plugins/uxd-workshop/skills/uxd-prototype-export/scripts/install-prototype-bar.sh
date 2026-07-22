#!/usr/bin/env bash
# Install Prototype Bar assets into a standalone HTML prototype or React workspace.
# Usage:
#   bash install-prototype-bar.sh --source <path> [--mode standalone|workspace] [--config <prototype-bar.json>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../templates" && pwd)"
SOURCE=""
MODE=""
CONFIG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --config) CONFIG="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: bash install-prototype-bar.sh --source <path> [--mode standalone|workspace] [--config <prototype-bar.json>]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SOURCE" ]]; then
  echo "Error: --source is required" >&2
  exit 1
fi

SOURCE="$(cd "$SOURCE" && pwd)"

detect_mode() {
  if [[ -f "$SOURCE/package.json" ]] && rg -q '"react"' "$SOURCE/package.json" 2>/dev/null; then
    echo workspace
    return
  fi
  if [[ -f "$SOURCE/package.json" ]] && grep -q '"react"' "$SOURCE/package.json" 2>/dev/null; then
    echo workspace
    return
  fi
  if ls "$SOURCE"/*.html >/dev/null 2>&1 || ls "$SOURCE"/**/*.html >/dev/null 2>&1; then
    echo standalone
    return
  fi
  echo standalone
}

# Resolve prototype-bar.json: explicit --config, sibling artifacts, or walk up for .artifacts/*/prototype-bar.json
resolve_config() {
  if [[ -n "$CONFIG" ]]; then
    if [[ ! -f "$CONFIG" ]]; then
      echo "Error: --config file not found: $CONFIG" >&2
      exit 1
    fi
    CONFIG="$(cd "$(dirname "$CONFIG")" && pwd)/$(basename "$CONFIG")"
    return
  fi

  if [[ -f "$SOURCE/prototype-bar.json" ]]; then
    CONFIG="$SOURCE/prototype-bar.json"
    return
  fi

  # SOURCE is often .artifacts/{ID}/prototype — config sits next to it
  if [[ -f "$SOURCE/../prototype-bar.json" ]]; then
    CONFIG="$(cd "$SOURCE/.." && pwd)/prototype-bar.json"
    return
  fi

  # Walk up looking for .artifacts/{ID}/prototype-bar.json
  local dir="$SOURCE"
  local i
  for i in 1 2 3 4 5; do
    if [[ -d "$dir/.artifacts" ]]; then
      local found
      found="$(find "$dir/.artifacts" -maxdepth 2 -type f -name 'prototype-bar.json' 2>/dev/null | head -n 1 || true)"
      if [[ -n "$found" ]]; then
        CONFIG="$found"
        return
      fi
    fi
    # If we're inside .artifacts/{ID}/...
    if [[ "$(basename "$(dirname "$dir")")" == ".artifacts" ]] && [[ -f "$dir/prototype-bar.json" ]]; then
      CONFIG="$dir/prototype-bar.json"
      return
    fi
    dir="$(dirname "$dir")"
  done
}

config_inline_script() {
  if [[ -z "$CONFIG" || ! -f "$CONFIG" ]]; then
    echo ""
    return
  fi
  python3 - "$CONFIG" <<'PY'
import json, sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
print("<script data-uxd-prototype-bar=\"config\">window.__UXD_PROTOTYPE__=" + json.dumps(data, separators=(",", ":")) + ";</script>")
PY
}

if [[ -z "$MODE" ]]; then
  MODE="$(detect_mode)"
fi

resolve_config
if [[ -n "$CONFIG" ]]; then
  echo "Using config: $CONFIG"
else
  echo "No prototype-bar.json found (Sources/Eval links limited until config is provided)"
fi

echo "Installing Prototype Bar into $SOURCE (mode=$MODE)"

install_standalone() {
  local dest_js="$SOURCE/uxd-prototype-bar"
  mkdir -p "$dest_js"
  cp "$TEMPLATE_DIR/serialize-page.browser.js" "$dest_js/"
  cp "$TEMPLATE_DIR/prototype-bar-standalone.js" "$dest_js/"
  cp "$TEMPLATE_DIR/prototype-bar.css" "$dest_js/"
  if [[ -n "$CONFIG" && -f "$CONFIG" ]]; then
    cp "$CONFIG" "$dest_js/prototype-bar.json"
  fi

  local cfg_script
  cfg_script="$(config_inline_script)"

  # Inject into every HTML file under source (max depth 3)
  local html_files
  html_files="$(find "$SOURCE" -maxdepth 3 -type f -name '*.html' ! -path '*/uxd-prototype-bar/*' 2>/dev/null || true)"
  if [[ -z "$html_files" ]]; then
    echo "Warning: no HTML files found under $SOURCE" >&2
    return
  fi

  local marker='data-uxd-prototype-bar="install"'
  while IFS= read -r html; do
    [[ -z "$html" ]] && continue
    if grep -q "$marker" "$html" 2>/dev/null; then
      # Refresh inline config if present
      if [[ -n "$cfg_script" ]]; then
        python3 - "$html" "$cfg_script" <<'PY'
import re, sys
path, cfg = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
pat = re.compile(r'<script data-uxd-prototype-bar="config">.*?</script>\s*', re.S)
if pat.search(text):
    text = pat.sub(cfg + "\n", text, count=1)
else:
    # Insert config before first bar script/link
    text = re.sub(
        r'(<link[^>]*data-uxd-prototype-bar="install"[^>]*>)',
        cfg + r"\n\1",
        text,
        count=1,
    )
open(path, "w", encoding="utf-8").write(text)
print("  refreshed config:", path)
PY
      else
        echo "  skip (already installed): $html"
      fi
      continue
    fi
    # Relative path from html dir to uxd-prototype-bar
    local html_dir rel
    html_dir="$(dirname "$html")"
    rel="$(python3 -c "import os.path; print(os.path.relpath('$dest_js', '$html_dir'))")"
    local snippet
    snippet="$(cat <<EOF
${cfg_script}
<link rel="stylesheet" href="${rel}/prototype-bar.css" ${marker} />
<script src="${rel}/serialize-page.browser.js" ${marker}></script>
<script src="${rel}/prototype-bar-standalone.js" ${marker}></script>
EOF
)"
    if grep -qi '</body>' "$html"; then
      python3 - "$html" "$snippet" <<'PY'
import sys
path, snippet = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
import re
new, n = re.subn(r"</body>", snippet + "\n</body>", text, count=1, flags=re.I)
if n == 0:
    new = text + "\n" + snippet + "\n"
open(path, "w", encoding="utf-8").write(new)
PY
      echo "  injected: $html"
    else
      printf '\n%s\n' "$snippet" >> "$html"
      echo "  appended: $html"
    fi
  done <<< "$html_files"
}

install_workspace() {
  local dest_dir="$SOURCE/src/components/uxd-prototype-bar"
  if [[ ! -d "$SOURCE/src" ]]; then
    dest_dir="$SOURCE/components/uxd-prototype-bar"
  fi
  mkdir -p "$dest_dir"
  cp "$TEMPLATE_DIR/PrototypeBar.tsx" "$dest_dir/"
  cp "$TEMPLATE_DIR/prototype-bar.css" "$dest_dir/"
  cp "$TEMPLATE_DIR/serialize-page.browser.js" "$dest_dir/"

  # Public copy so the browser can load the serializer + config without bundler help
  local public_dir=""
  if [[ -d "$SOURCE/public" ]]; then
    public_dir="$SOURCE/public/uxd-prototype-bar"
  elif [[ -d "$SOURCE/static" ]]; then
    public_dir="$SOURCE/static/uxd-prototype-bar"
  fi
  if [[ -n "$public_dir" ]]; then
    mkdir -p "$public_dir"
    cp "$TEMPLATE_DIR/serialize-page.browser.js" "$public_dir/"
    cp "$TEMPLATE_DIR/prototype-bar.css" "$public_dir/"
    if [[ -n "$CONFIG" && -f "$CONFIG" ]]; then
      cp "$CONFIG" "$public_dir/prototype-bar.json"
      echo "  copied config → $public_dir/prototype-bar.json"
    fi
    echo "  copied public assets → $public_dir"
  elif [[ -n "$CONFIG" && -f "$CONFIG" ]]; then
    cp "$CONFIG" "$dest_dir/prototype-bar.json"
    echo "  copied config → $dest_dir/prototype-bar.json (no public/ — fetch may need a bundler copy)"
  fi

  echo "  copied templates → $dest_dir"
  echo ""
  echo "Manual mount required if App is non-standard:"
  echo "  1. Import PrototypeBar and CSS in your app shell (e.g. src/App.tsx)"
  echo "  2. Render <PrototypeBar /> near the top of the layout"
  echo ""
  echo "Attempting auto-mount..."

  local app=""
  for candidate in \
    "$SOURCE/src/App.tsx" "$SOURCE/src/App.jsx" \
    "$SOURCE/App.tsx" "$SOURCE/App.jsx" \
    "$SOURCE/src/app/App.tsx"
  do
    if [[ -f "$candidate" ]]; then
      app="$candidate"
      break
    fi
  done

  if [[ -z "$app" ]]; then
    echo "  could not find App.* — mount PrototypeBar manually"
    return
  fi

  if grep -q 'PrototypeBar' "$app" 2>/dev/null; then
    echo "  App already references PrototypeBar: $app"
    return
  fi

  python3 - "$app" "$dest_dir" "$SOURCE" <<'PY'
import os, re, sys
app_path, dest_dir, source = sys.argv[1], sys.argv[2], sys.argv[3]
rel = os.path.relpath(dest_dir, os.path.dirname(app_path)).replace("\\", "/")
if not rel.startswith("."):
    rel = "./" + rel
import_line = f'import {{ PrototypeBar }} from "{rel}/PrototypeBar";\n'
css_line = f'import "{rel}/prototype-bar.css";\n'
text = open(app_path, encoding="utf-8").read()
# Insert imports after last import
imports = list(re.finditer(r'^import .+;?\s*$', text, re.M))
if imports:
    idx = imports[-1].end()
    text = text[:idx] + "\n" + import_line + css_line + text[idx:]
else:
    text = import_line + css_line + text

# Insert <PrototypeBar /> after first return (
def inject_jsx(s):
    m = re.search(r'(return\s*\(\s*)', s)
    if not m:
        m = re.search(r'(return\s+)(<)', s)
        if not m:
            return s, False
        return s[:m.end(1)] + "<>\n      <PrototypeBar />\n      " + s[m.start(2):].rstrip() + "\n    </>\n", True
    # After return (
    insert_at = m.end()
    return s[:insert_at] + "\n      <PrototypeBar />\n" + s[insert_at:], True

text2, ok = inject_jsx(text)
if not ok:
    print("  could not auto-inject JSX — add <PrototypeBar /> manually in", app_path)
else:
    open(app_path, "w", encoding="utf-8").write(text2)
    print("  mounted PrototypeBar in", app_path)
PY
}

case "$MODE" in
  standalone) install_standalone ;;
  workspace) install_workspace ;;
  *)
    echo "Error: --mode must be standalone or workspace" >&2
    exit 1
    ;;
esac

echo "Prototype Bar install complete."
