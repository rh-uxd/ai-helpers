---
name: uxd-figma-read
description: >-
  Retrieve design context from a Figma file. Use when any workflow needs
  screenshots, page structure, node metadata, or design tokens from a Figma URL.
  Handles URL parsing, Figma MCP detection with REST API fallback, page
  discovery, and frame export. Pair with other skills that need Figma input.
---

# Get Figma

Reusable Figma access layer — parses a Figma URL, detects whether the Figma MCP is available, falls back to the REST API if not, and returns screenshots, page structure, and metadata for downstream use.

Other skills that need Figma input should reference this skill rather than implementing their own access logic.

## Prerequisites

This skill needs **read access to the Figma file**. It supports two paths — try them in order.

### Path A: Figma MCP (preferred)

If the Figma MCP is connected, this skill uses `get_screenshot`, `get_metadata`, and `get_variable_defs` directly.

**Detect availability:** attempt a `get_metadata` call with the file key (no node ID). If it succeeds, use Path A for the rest of the workflow. If the MCP server requires authentication, call `mcp_auth` for the Figma server first, then retry.

### Path B: Figma REST API (fallback)

If the Figma MCP is unavailable, fall back to the REST API with a Personal Access Token.

The user needs one environment variable:

```bash
export FIGMA_PAT="your-personal-access-token"
```

Tokens are created at: https://www.figma.com/developers/apps — create a token with `file_content:read` scope.

Before making any API call, verify the token is set:

```bash
if [ -z "$FIGMA_PAT" ]; then
  echo "ERROR: Set FIGMA_PAT to your Figma personal access token."
  echo "Create one at https://www.figma.com/developers/apps"
  exit 1
fi
```

If the token is missing, **stop and ask the user** to set it. Do not proceed without valid credentials.

See [references/figma-rest-api.md](references/figma-rest-api.md) for the full REST API reference.

## Workflow

### Step 1: Parse the Figma URL

Extract the file key and node ID from the URL the user provides.

Figma URLs follow these patterns:

```
https://www.figma.com/design/<FILE_KEY>/<FILE_NAME>?node-id=<NODE_ID>
https://www.figma.com/file/<FILE_KEY>/<FILE_NAME>?node-id=<NODE_ID>
```

Parse out `FILE_KEY` and `NODE_ID`. The node ID in the URL uses `-` as a separator (e.g., `16-1047`) but the REST API expects `:` (e.g., `16:1047`). Convert accordingly.

If no `node-id` is present, the scope is the entire file starting from the first page.

### Step 2: Discover file structure

Get the file's page names, top-level frames, and overall organization. Page names are critical context — designers use them to organize options, states, flows, and versions.

**Path A (MCP):**
1. Call `get_metadata` with the file key and **no `nodeId`** to get the **list of pages** and their names
2. Call `get_metadata` again with the target page ID (e.g., `0:1`) as the `nodeId` to get the **top-level frames** within that page — this returns an XML tree with frame IDs, names, and positions
3. Review page and frame names for structural cues — names like "Option 1", "V2", "Final", "Exploration", or flow labels tell you how the designer organized the work
4. **Collect the individual frame IDs** from the XML — you will need these for per-frame screenshots and variable extraction in Step 3

**Path B (REST API):**

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY?depth=2" \
  | python3 -m json.tool
```

**Return to the calling workflow:**
- List of page names and IDs
- Top-level frame names and IDs within the target page(s)
- Any structural cues from the naming (e.g., "this file has 3 pages named Option A, Option B, Option C")

### Step 3: Capture screenshots and tokens

Export the relevant frames as images so downstream skills have visual context.

**Path A (MCP):**

Screenshot each **individual top-level frame** discovered in Step 2 — do not screenshot the page node. Page-level screenshots combine all frames into a single image, making details hard to read and losing the ability to associate each screenshot with a specific design option.

For each frame:
1. Call `get_screenshot` with the **frame's node ID** (e.g., `16:1047`), not the page ID (e.g., `0:1`)
2. Call `get_variable_defs` with the **same frame node ID** to get design tokens in use — this tool does not work on page-level nodes

Use `maxDimension` (default 1024, max 65536) to control image resolution. For detailed design review, use 2048. For thumbnails or quick overviews, 1024 is sufficient. The response includes both the rendered size and the original canvas size so you can decide whether to re-request at higher resolution.

**Path B (REST API):**

```bash
NODE_IDS="16:1047,16:1048"  # comma-separated node IDs
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_IDS&format=png&scale=2"
```

This returns temporary URLs (expire after 30 days). Download the images for analysis.

Alternatively, use the helper script:

```bash
bash "$CLAUDE_SKILL_DIR/scripts/export-figma-frames.sh" "$FILE_KEY" "$NODE_IDS"
```

### Step 4: Return context

Provide the following to the downstream workflow:

| Output | Source |
|--------|--------|
| Page names and IDs | Step 2 |
| Frame names and IDs | Step 2 |
| Per-frame screenshots (images) | Step 3 — one screenshot per top-level frame |
| Design tokens in use | Step 3 (MCP: `get_variable_defs` per frame, REST API: `GET /v1/files/:key/styles`) |
| File metadata (name, last modified) | Step 2 |
| Structural interpretation | Step 2 (e.g., "file contains 3 design directions across 3 pages") |

## Error Handling

| Problem | Action |
|---------|--------|
| Figma MCP unavailable and no `FIGMA_PAT` set | Stop and ask the user to either connect the Figma MCP or set `FIGMA_PAT` |
| MCP returns auth error or "needs authentication" | Call `mcp_auth` for the Figma server, then retry the original call |
| `get_variable_defs` returns "select a layer first" | You passed a page-level node ID — retry with a frame-level node ID from Step 2 |
| REST API returns 403 | Token lacks `file_content:read` scope or the file isn't shared with the token owner |
| REST API returns 404 | File key or node ID is incorrect — ask the user to verify the URL |
| Node IDs export as `null` | Node is invisible or has 0% opacity in Figma — ask the user to make it visible |
| URL doesn't match expected pattern | Ask the user for the Figma file URL |
| Rate limited (429) | Wait for `Retry-After` seconds and retry; batch node IDs to reduce request count |

## Tips

- **Screenshot per frame, not per page.** Page-level screenshots combine all frames into one dense image where details are lost. Always use individual frame node IDs.
- **Read the page names.** Designers encode intent in page and frame names — "Explorations", "Final", "Option A vs B" tell you the file's purpose and scope.
- **Batch image exports (REST API only).** Pass all node IDs in one comma-separated `ids` parameter instead of one request per frame. MCP `get_screenshot` requires one call per node.
- **PNG at 2x / maxDimension 2048** is the best balance of quality and file size for AI vision analysis.
- **Use `depth=2`** on the REST API file endpoint to avoid downloading the entire node tree when you only need pages and top-level frames.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [figma-rest-api.md](references/figma-rest-api.md) | REST API endpoints and patterns for Path B |
