#!/usr/bin/env python3
"""
Fetch a Jira issue via the REST API.

Usage:
    python3 fetch_jira.py PROJ-1234 [--fields field1,field2] [--markdown] [--json]

Requires environment variables:
    JIRA_SERVER  — Jira instance URL (e.g., https://jira.example.com)
    JIRA_USER    — Jira username/email
    JIRA_TOKEN   — Jira API token
"""

import sys
import os
import json
import re
import urllib.request
import urllib.error
import base64


def require_env():
    server = os.environ.get('JIRA_SERVER')
    user = os.environ.get('JIRA_USER')
    token = os.environ.get('JIRA_TOKEN')
    if not all([server, user, token]):
        print('Error: JIRA_SERVER, JIRA_USER, and JIRA_TOKEN must be set', file=sys.stderr)
        sys.exit(1)
    return server, user, token


def fetch_issue(server, user, token, issue_key, fields=None):
    url = f'{server}/rest/api/2/issue/{issue_key}'
    if fields:
        url += f'?fields={",".join(fields)}'

    credentials = base64.b64encode(f'{user}:{token}'.encode()).decode()
    req = urllib.request.Request(url, headers={
        'Authorization': f'Basic {credentials}',
        'Content-Type': 'application/json',
    })

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f'Error fetching {issue_key}: {e.code} {e.reason}', file=sys.stderr)
        sys.exit(1)


def adf_to_markdown(adf):
    """Convert Atlassian Document Format to markdown (simplified)."""
    if isinstance(adf, str):
        return adf
    if not isinstance(adf, dict) or 'content' not in adf:
        return str(adf) if adf else ''

    result = []
    for block in adf.get('content', []):
        block_type = block.get('type', '')
        if block_type == 'paragraph':
            text = extract_text(block)
            result.append(text)
        elif block_type == 'heading':
            level = block.get('attrs', {}).get('level', 1)
            text = extract_text(block)
            result.append(f'{"#" * level} {text}')
        elif block_type == 'bulletList':
            for item in block.get('content', []):
                text = extract_text(item)
                result.append(f'- {text}')
        elif block_type == 'orderedList':
            for i, item in enumerate(block.get('content', []), 1):
                text = extract_text(item)
                result.append(f'{i}. {text}')
        elif block_type == 'codeBlock':
            lang = block.get('attrs', {}).get('language', '')
            text = extract_text(block)
            result.append(f'```{lang}\n{text}\n```')
        elif block_type == 'table':
            result.append(format_table(block))
        else:
            text = extract_text(block)
            if text:
                result.append(text)
    return '\n\n'.join(result)


def extract_text(node):
    if not isinstance(node, dict):
        return ''
    if node.get('type') == 'text':
        return node.get('text', '')
    texts = []
    for child in node.get('content', []):
        texts.append(extract_text(child))
    return ''.join(texts)


def format_table(table_node):
    rows = []
    for row in table_node.get('content', []):
        cells = []
        for cell in row.get('content', []):
            cells.append(extract_text(cell).strip())
        rows.append(cells)

    if not rows:
        return ''

    lines = []
    lines.append('| ' + ' | '.join(rows[0]) + ' |')
    lines.append('| ' + ' | '.join(['---'] * len(rows[0])) + ' |')
    for row in rows[1:]:
        lines.append('| ' + ' | '.join(row) + ' |')
    return '\n'.join(lines)


def extract_user_stories(description_md):
    """Extract user stories from an RFE description."""
    stories = []
    lines = description_md.split('\n')
    in_stories = False
    current_story = []

    for line in lines:
        if re.match(r'#+\s*user.?stor', line, re.IGNORECASE):
            in_stories = True
            continue
        if in_stories and re.match(r'#+\s', line):
            if current_story:
                stories.append('\n'.join(current_story).strip())
                current_story = []
            in_stories = False
            continue
        if in_stories:
            current_story.append(line)

    if current_story:
        stories.append('\n'.join(current_story).strip())

    return stories


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    issue_key = sys.argv[1]
    fields = None
    as_markdown = False
    as_json = True

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--fields' and i + 1 < len(sys.argv):
            fields = sys.argv[i + 1].split(',')
            i += 2
        elif sys.argv[i] == '--markdown':
            as_markdown = True
            as_json = False
            i += 1
        elif sys.argv[i] == '--json':
            as_json = True
            as_markdown = False
            i += 1
        else:
            i += 1

    server, user, token = require_env()
    data = fetch_issue(server, user, token, issue_key, fields)

    issue_fields = data.get('fields', {})
    result = {
        'key': data.get('key'),
        'summary': issue_fields.get('summary', ''),
        'description': '',
        'status': '',
        'priority': '',
        'issueType': '',
        'labels': [],
        'components': [],
    }

    desc = issue_fields.get('description', '')
    if isinstance(desc, dict):
        result['description'] = adf_to_markdown(desc)
    elif isinstance(desc, str):
        result['description'] = desc

    status = issue_fields.get('status', {})
    result['status'] = status.get('name', '') if isinstance(status, dict) else str(status)

    priority = issue_fields.get('priority', {})
    result['priority'] = priority.get('name', '') if isinstance(priority, dict) else str(priority)

    issue_type = issue_fields.get('issuetype', {})
    result['issueType'] = issue_type.get('name', '') if isinstance(issue_type, dict) else str(issue_type)

    result['labels'] = issue_fields.get('labels', [])

    components = issue_fields.get('components', [])
    result['components'] = [c.get('name', '') for c in components if isinstance(c, dict)]

    result['user_stories'] = extract_user_stories(result['description'])

    if as_markdown:
        print(f'# {result["key"]}: {result["summary"]}')
        print(f'\n**Status:** {result["status"]}')
        print(f'**Priority:** {result["priority"]}')
        print(f'**Type:** {result["issueType"]}')
        if result['labels']:
            print(f'**Labels:** {", ".join(result["labels"])}')
        if result['components']:
            print(f'**Components:** {", ".join(result["components"])}')
        print(f'\n## Description\n\n{result["description"]}')
        if result['user_stories']:
            print(f'\n## Extracted User Stories\n')
            for i, story in enumerate(result['user_stories'], 1):
                print(f'### Story {i}\n{story}\n')
    else:
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
