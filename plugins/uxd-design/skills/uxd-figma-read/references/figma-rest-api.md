# Figma REST API Reference

Fallback API access when the Figma MCP is unavailable. Uses `curl` with a Personal Access Token.

## Authentication

All requests require a Personal Access Token via the `X-Figma-Token` header.

```bash
# Verify token is set before any API call
if [ -z "$FIGMA_PAT" ]; then
  echo "ERROR: Set FIGMA_PAT to your Figma personal access token."
  echo "Create one at https://www.figma.com/developers/apps"
  exit 1
fi
```

Create a token at https://www.figma.com/developers/apps with `file_content:read` scope.

## Parsing Figma URLs

Figma URLs contain the file key and optionally a node ID:

```
https://www.figma.com/design/<FILE_KEY>/<FILE_NAME>?node-id=<NODE_ID>&...
```

The node ID in URLs uses `-` (e.g., `16-1047`) but the API expects `:` (e.g., `16:1047`).

```bash
parse_figma_url() {
  local url="$1"
  FILE_KEY=$(echo "$url" | sed -n 's|.*figma\.com/[^/]*/\([^/]*\)/.*|\1|p')
  NODE_ID=$(echo "$url" | sed -n 's|.*node-id=\([^&]*\).*|\1|p' | tr '-' ':')
}
```

## Endpoints

### Get File Structure

Returns the full document tree as JSON. Useful for discovering pages and top-level frames.

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY" \
  | python3 -m json.tool
```

For large files, limit the response depth:

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY?depth=2"
```

### Get Specific Nodes

Returns only the requested nodes and their subtrees. More efficient than fetching the entire file.

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_IDS"
```

`NODE_IDS` is a comma-separated list using `:` format (e.g., `16:1047,16:1048`).

### Export Frames as Images

Renders nodes as PNG, JPG, SVG, or PDF. This is the primary endpoint for capturing design screenshots.

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_IDS&format=png&scale=2"
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `ids` | string | Comma-separated node IDs (required) |
| `format` | string | `png`, `jpg`, `svg`, or `pdf` (default: `png`) |
| `scale` | number | 0.01–4 (default: 1). SVG always exports at 1x. |
| `contents_only` | boolean | Exclude overlapping content from siblings (default: `true`) |
| `use_absolute_bounds` | boolean | Use full node dimensions even if cropped (default: `false`) |

**Response:**

```json
{
  "images": {
    "16:1047": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/...",
    "16:1048": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/..."
  }
}
```

Image URLs expire after 30 days. Download immediately if needed for later reference.

**Downloading exported images:**

```bash
RESPONSE=$(curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_IDS&format=png&scale=2")

echo "$RESPONSE" | python3 -c "
import json, sys, urllib.request, os
data = json.load(sys.stdin)
for node_id, url in data.get('images', {}).items():
    if url:
        fname = f'figma-{node_id.replace(\":\", \"-\")}.png'
        urllib.request.urlretrieve(url, fname)
        print(f'Downloaded {fname}')
    else:
        print(f'Node {node_id}: export returned null (node may be invisible)')
"
```

### Get File Metadata (Lightweight)

Returns file name, last modified time, version, and thumbnail URL without the full document tree.

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY/metadata"
```

### Get File Components

Returns published components in the file.

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY/components"
```

### Get File Styles

Returns published styles (colors, text styles, effects) in the file.

```bash
curl -s -H "X-Figma-Token: $FIGMA_PAT" \
  "https://api.figma.com/v1/files/$FILE_KEY/styles"
```

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | Success | Proceed |
| 400 | Bad request | Check node ID format (must use `:` not `-`) |
| 403 | Forbidden | Token lacks scope or file isn't shared with token owner |
| 404 | Not found | Verify file key and node IDs from the URL |
| 429 | Rate limited | Wait for `Retry-After` seconds and retry |
| 500 | Server error | Retry once after a brief pause |

## Rate Limits

The Figma REST API has tiered rate limits:

| Tier | Endpoints | Limit |
|------|-----------|-------|
| Tier 1 | File content, images | Most restrictive |
| Tier 2 | Comments, versions | Moderate |
| Tier 3 | Metadata, components | Least restrictive |

Batch node IDs into single requests (comma-separated in `ids` param) rather than making one request per node.

## Tips

- **Use `depth=2` on GET files** to avoid downloading the entire tree when you only need top-level structure
- **Batch image exports** — pass all node IDs in one `ids` parameter instead of one request per frame
- **PNG at 2x scale** is the best balance of quality and size for AI vision analysis
- **Null in the images map** means the node is invisible or has 0% opacity — ask the user to check Figma
- SVG ignores the `scale` parameter — it always exports at 1x
