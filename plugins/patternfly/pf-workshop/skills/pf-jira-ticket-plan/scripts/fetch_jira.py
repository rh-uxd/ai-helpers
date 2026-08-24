#!/usr/bin/env python3
"""Fetch a Jira issue via the REST API.

Usage:
    python3 fetch_jira.py PROJ-123 [--markdown|--json]
    python3 fetch_jira.py https://issues.example.com/browse/PROJ-123 [--markdown|--json]

Auth environment variables:
    JIRA_SERVER  — instance URL (optional when a full ticket URL is given)
    JIRA_USER    — username or email (Basic auth)
    JIRA_TOKEN or JIRA_API_TOKEN — API token or password

Create a token at:
    https://id.atlassian.com/manage-profile/security/api-tokens

If JIRA_USER is unset, the token is sent as a Bearer PAT.
When stdin is a TTY and credentials are missing, the script prompts for them.
"""

import argparse
import base64
import getpass
import json
import os
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse

TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens"
TOKEN_HELP = (
    "Create a Jira API token at:\n"
    f"  {TOKEN_URL}\n"
    "Use your Atlassian account email as JIRA_USER and paste the token as JIRA_TOKEN."
)

ISSUE_KEY_RE = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")
HOST_RE = re.compile(r"https?://[^/\s]+", re.IGNORECASE)


def require_http_url(url):
    """Reject file: and other non-http(s) schemes before urlopen."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        print(f"Error: only http(s) URLs are allowed, got {url!r}", file=sys.stderr)
        raise SystemExit(1)
    return url


def parse_input(value):
    key_match = re.search(r"\b([A-Za-z][A-Za-z0-9]+-\d+)\b", value)
    if not key_match:
        raise SystemExit(f"Error: could not find an issue key in: {value}")

    key = key_match.group(1).upper()
    host_match = HOST_RE.search(value.strip())
    server = host_match.group(0).rstrip("/") if host_match else None
    return key, server


def prompt_missing_credentials(server, user, token):
    """Fill missing auth from stdin when running interactively."""
    if not sys.stdin.isatty() or (server and token):
        return server, user, token

    print(TOKEN_HELP, file=sys.stderr)
    if not server:
        server = input("Jira site URL (e.g. https://redhat.atlassian.net): ").strip()
    if not user:
        entered = input("Atlassian account email (JIRA_USER): ").strip()
        user = entered or None
    if not token:
        token = getpass.getpass("JIRA_TOKEN: ").strip() or None
    return server, user, token


def auth_headers(user, token):
    if user:
        credentials = base64.b64encode(f"{user}:{token}".encode()).decode()
        return {"Authorization": f"Basic {credentials}"}
    return {"Authorization": f"Bearer {token}"}


def fetch_issue(server, user, token, issue_key):
    url = (
        f"{server}/rest/api/2/issue/{issue_key}"
        "?fields=summary,description,status,priority,issuetype,labels,"
        "components,comment,issuelinks,subtasks,parent,assignee,reporter,environment"
        "&expand=renderedFields"
    )
    require_http_url(url)
    req = urllib.request.Request(
        url,
        headers={
            **auth_headers(user, token),
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        # Scheme is restricted to http(s) by require_http_url above.
        with urllib.request.urlopen(req, timeout=30) as response:  # nosec B310
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace") if exc.fp else ""
        print(f"Error fetching {issue_key}: {exc.code} {exc.reason}", file=sys.stderr)
        if body:
            print(body[:500], file=sys.stderr)
        raise SystemExit(1)
    except urllib.error.URLError as exc:
        print(f"Error reaching {server}: {exc.reason}", file=sys.stderr)
        raise SystemExit(1)


def field_name(obj, fallback=""):
    if isinstance(obj, dict):
        return obj.get("name") or obj.get("displayName") or fallback
    return str(obj) if obj else fallback


def description_text(fields, rendered):
    if rendered and rendered.get("description"):
        # Strip tags lightly for markdown planning
        text = re.sub(r"<br\s*/?>", "\n", rendered["description"], flags=re.I)
        text = re.sub(r"</p>", "\n\n", text, flags=re.I)
        text = re.sub(r"<[^>]+>", "", text)
        return unescape(text).strip()
    desc = fields.get("description") or ""
    if isinstance(desc, dict):
        return adf_to_markdown(desc)
    return str(desc).strip()


def unescape(text):
    return (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )


def adf_to_markdown(adf):
    if isinstance(adf, str):
        return adf
    if not isinstance(adf, dict) or "content" not in adf:
        return str(adf) if adf else ""
    result = []
    for block in adf.get("content", []):
        block_type = block.get("type", "")
        text = extract_text(block)
        if block_type == "heading":
            level = block.get("attrs", {}).get("level", 1)
            result.append(f'{"#" * level} {text}')
        elif block_type == "bulletList":
            for item in block.get("content", []):
                result.append(f"- {extract_text(item)}")
        elif block_type == "orderedList":
            for i, item in enumerate(block.get("content", []), 1):
                result.append(f"{i}. {extract_text(item)}")
        elif block_type == "codeBlock":
            lang = block.get("attrs", {}).get("language", "")
            result.append(f"```{lang}\n{text}\n```")
        elif text:
            result.append(text)
    return "\n\n".join(result)


def extract_text(node):
    if not isinstance(node, dict):
        return ""
    if node.get("type") == "text":
        return node.get("text", "")
    return "".join(extract_text(child) for child in node.get("content", []))


def comments_text(fields):
    comments = (fields.get("comment") or {}).get("comments") or []
    lines = []
    for comment in comments[-8:]:
        author = field_name(comment.get("author"), "unknown")
        created = (comment.get("created") or "")[:10]
        body = comment.get("body", "")
        if isinstance(body, dict):
            body = adf_to_markdown(body)
        body = str(body).strip()
        if body:
            lines.append(f"**{author}** ({created}):\n{body}")
    return "\n\n".join(lines)


def links_text(fields):
    items = []
    for link in fields.get("issuelinks") or []:
        if "outwardIssue" in link:
            key = link["outwardIssue"].get("key", "")
            rel = (link.get("type") or {}).get("outward", "relates to")
            summary = (link["outwardIssue"].get("fields") or {}).get("summary", "")
            items.append(f"- {rel} {key}: {summary}")
        if "inwardIssue" in link:
            key = link["inwardIssue"].get("key", "")
            rel = (link.get("type") or {}).get("inward", "relates to")
            summary = (link["inwardIssue"].get("fields") or {}).get("summary", "")
            items.append(f"- {rel} {key}: {summary}")
    return "\n".join(items)


def summarize(data):
    fields = data.get("fields") or {}
    rendered = data.get("renderedFields") or {}
    components = [c.get("name", "") for c in fields.get("components") or [] if isinstance(c, dict)]
    return {
        "key": data.get("key"),
        "summary": fields.get("summary", ""),
        "description": description_text(fields, rendered),
        "status": field_name(fields.get("status")),
        "priority": field_name(fields.get("priority")),
        "issueType": field_name(fields.get("issuetype")),
        "labels": fields.get("labels") or [],
        "components": components,
        "assignee": field_name(fields.get("assignee"), "Unassigned"),
        "reporter": field_name(fields.get("reporter")),
        "parent": (fields.get("parent") or {}).get("key"),
        "comments": comments_text(fields),
        "links": links_text(fields),
        "self": data.get("self", ""),
    }


def to_markdown(result, browse_url):
    lines = [
        f"# {result['key']}: {result['summary']}",
        "",
        f"**Type:** {result['issueType']} | **Status:** {result['status']} | **Priority:** {result['priority']}",
        f"**Assignee:** {result['assignee']} | **Reporter:** {result['reporter']}",
    ]
    if browse_url:
        lines.append(f"**Link:** {browse_url}")
    if result["labels"]:
        lines.append(f"**Labels:** {', '.join(result['labels'])}")
    if result["components"]:
        lines.append(f"**Components:** {', '.join(result['components'])}")
    if result["parent"]:
        lines.append(f"**Parent:** {result['parent']}")
    lines.extend(["", "## Description", "", result["description"] or "(empty)"])
    if result["links"]:
        lines.extend(["", "## Linked issues", "", result["links"]])
    if result["comments"]:
        lines.extend(["", "## Recent comments", "", result["comments"]])
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Fetch a Jira issue")
    parser.add_argument("ticket", help="Issue key or browse URL")
    parser.add_argument("--markdown", action="store_true", help="Print markdown (default)")
    parser.add_argument("--json", action="store_true", help="Print JSON")
    args = parser.parse_args()

    key, url_server = parse_input(args.ticket)
    server = url_server or os.environ.get("JIRA_SERVER")
    user = os.environ.get("JIRA_USER")
    token = os.environ.get("JIRA_TOKEN") or os.environ.get("JIRA_API_TOKEN")
    server, user, token = prompt_missing_credentials(server, user, token)

    if not server:
        print("Error: JIRA_SERVER must be set, or pass a full ticket URL", file=sys.stderr)
        raise SystemExit(1)
    if not token:
        print("Error: JIRA_TOKEN or JIRA_API_TOKEN must be set.", file=sys.stderr)
        print(TOKEN_HELP, file=sys.stderr)
        raise SystemExit(1)

    server = require_http_url(server.rstrip("/"))
    data = fetch_issue(server, user, token, key)
    result = summarize(data)
    browse_url = f"{server}/browse/{key}"

    if args.json:
        result["link"] = browse_url
        print(json.dumps(result, indent=2))
    else:
        print(to_markdown(result, browse_url))


if __name__ == "__main__":
    main()
