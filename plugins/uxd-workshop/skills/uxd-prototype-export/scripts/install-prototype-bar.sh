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
  cp "$TEMPLATE_DIR/export-pf-spec.browser.js" "$dest_js/"
  cp "$TEMPLATE_DIR/uxd-scenario-runtime.js" "$dest_js/"
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
      # Refresh inline config if present; ensure scenario runtime script is present
      python3 - "$html" "$cfg_script" "$dest_js" <<'PY'
import os, re, sys
path, cfg, dest_js = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
html_dir = os.path.dirname(path)
rel = os.path.relpath(dest_js, html_dir).replace("\\", "/")
if cfg:
    pat = re.compile(r'<script data-uxd-prototype-bar="config">.*?</script>\s*', re.S)
    if pat.search(text):
        text = pat.sub(cfg + "\n", text, count=1)
    else:
        text = re.sub(
            r'(<link[^>]*data-uxd-prototype-bar="install"[^>]*>)',
            cfg + r"\n\1",
            text,
            count=1,
        )
runtime = f'<script src="{rel}/uxd-scenario-runtime.js" data-uxd-prototype-bar="install"></script>'
if "uxd-scenario-runtime.js" not in text:
    text = re.sub(
        r'(<script[^>]*serialize-page\.browser\.js[^>]*></script>)',
        r"\1\n" + runtime,
        text,
        count=1,
    )
pf_spec = f'<script src="{rel}/export-pf-spec.browser.js" data-uxd-prototype-bar="install"></script>'
if "export-pf-spec.browser.js" not in text:
    text = re.sub(
        r'(<script[^>]*serialize-page\.browser\.js[^>]*></script>)',
        r"\1\n" + pf_spec,
        text,
        count=1,
    )
open(path, "w", encoding="utf-8").write(text)
print("  refreshed config:", path)
PY
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
<script src="${rel}/export-pf-spec.browser.js" ${marker}></script>
<script src="${rel}/uxd-scenario-runtime.js" ${marker}></script>
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
  cp "$TEMPLATE_DIR/useUxdScenario.ts" "$dest_dir/"
  cp "$TEMPLATE_DIR/prototype-bar.css" "$dest_dir/"
  cp "$TEMPLATE_DIR/serialize-page.browser.js" "$dest_dir/"
  cp "$TEMPLATE_DIR/export-pf-spec.browser.js" "$dest_dir/"
  cp "$TEMPLATE_DIR/uxd-scenario-runtime.js" "$dest_dir/"

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
    cp "$TEMPLATE_DIR/export-pf-spec.browser.js" "$public_dir/"
    cp "$TEMPLATE_DIR/uxd-scenario-runtime.js" "$public_dir/"
    cp "$TEMPLATE_DIR/prototype-bar.css" "$public_dir/"
    cp "$TEMPLATE_DIR/prototype-bar-standalone.js" "$public_dir/"
    if [[ -n "$CONFIG" && -f "$CONFIG" ]]; then
      cp "$CONFIG" "$public_dir/prototype-bar.json"
      echo "  copied config → $public_dir/prototype-bar.json"
    fi
    echo "  copied public assets → $public_dir"
  elif [[ -n "$CONFIG" && -f "$CONFIG" ]]; then
    cp "$CONFIG" "$dest_dir/prototype-bar.json"
    echo "  copied config → $dest_dir/prototype-bar.json (no public/ — fetch may need a bundler copy)"
  fi

  # Ensure scenario + export runtimes are loadable from index.html when present.
  # Use relative paths (no leading /) so <base href> works on GitLab/GitHub Pages.
  # Also refresh inlined Prototype Bar (config + standalone + CSS) when present —
  # webpack HtmlWebpackPlugin ships src/index.html, so stale inlines break Pages Eval.
  local index_html=""
  for candidate in "$SOURCE/src/index.html" "$SOURCE/index.html" "$SOURCE/public/index.html"; do
    if [[ -f "$candidate" ]]; then
      index_html="$candidate"
      break
    fi
  done
  if [[ -n "$index_html" && -n "$public_dir" ]]; then
    python3 - "$index_html" "$CONFIG" "$TEMPLATE_DIR" <<'PY'
import json, re, sys
from pathlib import Path

path = Path(sys.argv[1])
config_path = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else ""
template_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else None
text = path.read_text(encoding="utf-8")
changed = False

def ensure_script(html, src, attr):
    if src.split("/")[-1] in html and attr in html:
        return html, False
    snippet = f'<script src="{src}" {attr}="true"></script>\n'
    new, n = re.subn(r"</head>", snippet + "</head>", html, count=1, flags=re.I)
    if n == 0:
        new, n = re.subn(r"</body>", snippet + "</body>", html, count=1, flags=re.I)
    return (new, True) if n else (html, False)

text, did = ensure_script(
    text, "uxd-prototype-bar/uxd-scenario-runtime.js", "data-uxd-scenario-runtime"
)
changed = changed or did
if did:
    print("  injected scenario runtime into", path)

text, did = ensure_script(
    text, "uxd-prototype-bar/serialize-page.browser.js", "data-uxd-serialize-bundle"
)
changed = changed or did
if did:
    print("  injected export runtime into", path)

text, did = ensure_script(
    text, "uxd-prototype-bar/export-pf-spec.browser.js", "data-uxd-pf-spec-bundle"
)
changed = changed or did
if did:
    print("  injected PF implementation-spec runtime into", path)

# Refresh inlined bar pieces used by HtmlWebpackPlugin templates.
# Use callable replacements so JS/CSS backslashes are not treated as re escapes.
if config_path and Path(config_path).is_file() and 'data-uxd-prototype-bar="config"' in text:
    cfg = json.dumps(json.loads(Path(config_path).read_text(encoding="utf-8")), separators=(",", ":"))
    cfg_script = f'<script data-uxd-prototype-bar="config">window.__UXD_PROTOTYPE__={cfg};</script>'
    new, n = re.subn(
        r'<script data-uxd-prototype-bar="config">[\s\S]*?</script>',
        lambda _m: cfg_script,
        text,
        count=1,
    )
    if n:
        text = new
        changed = True
        print("  refreshed inlined Prototype Bar config in", path)

if template_dir and template_dir.is_dir() and 'data-uxd-prototype-bar="standalone"' in text:
    standalone = (template_dir / "prototype-bar-standalone.js").read_text(encoding="utf-8")
    standalone_script = (
        f'<script data-uxd-prototype-bar="standalone">\n{standalone}\n</script>'
    )
    new, n = re.subn(
        r'<script data-uxd-prototype-bar="standalone">[\s\S]*?</script>',
        lambda _m: standalone_script,
        text,
        count=1,
    )
    if n:
        text = new
        changed = True
        print("  refreshed inlined Prototype Bar standalone runtime in", path)

if template_dir and template_dir.is_dir() and "data-uxd-prototype-bar-style" in text:
    css = (template_dir / "prototype-bar.css").read_text(encoding="utf-8")
    style_tag = f'<style data-uxd-prototype-bar-style>\n{css}\n</style>'
    new, n = re.subn(
        r'<style[^>]*data-uxd-prototype-bar-style[^>]*>[\s\S]*?</style>',
        lambda _m: style_tag,
        text,
        count=1,
    )
    if n:
        text = new
        changed = True
        print("  refreshed inlined Prototype Bar CSS in", path)

if changed:
    path.write_text(text, encoding="utf-8")
elif (
    "uxd-scenario-runtime.js" in text
    and "serialize-page.browser.js" in text
    and "export-pf-spec.browser.js" in text
):
    print("  runtimes already referenced in", path)
else:
    print("  could not inject runtimes — add uxd-scenario-runtime.js / serialize-page.browser.js / export-pf-spec.browser.js manually")
PY
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
