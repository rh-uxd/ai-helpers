#!/usr/bin/env python3
"""
YAML frontmatter read/write/schema utility for prototype-creator artifacts.

Usage:
    python3 scripts/frontmatter.py read <file>
    python3 scripts/frontmatter.py set <file> key=value [key=value ...]
    python3 scripts/frontmatter.py schema <type>

Types: prototype, review, decision, submission
"""

import sys
import re
import json
import datetime

SCHEMAS = {
    'prototype': {
        'prototype_id': {'type': 'string', 'required': True},
        'title': {'type': 'string', 'required': True},
        'source_rfe': {'type': 'string', 'required': True},
        'jira_key': {'type': 'string', 'required': False},
        'mode': {'type': 'string', 'required': True, 'values': ['auto', 'decide']},
        'status': {'type': 'string', 'required': True, 'values': ['draft', 'reviewed', 'refined', 'submitted']},
        'iteration': {'type': 'int', 'required': False, 'default': 0},
        'created_at': {'type': 'datetime', 'required': True},
        'updated_at': {'type': 'datetime', 'required': False},
        'decisions': {'type': 'list', 'required': False},
        'review_score': {'type': 'int', 'required': False},
        'review_verdict': {'type': 'string', 'required': False, 'values': ['rubric-pass', 'needs-attention', None]},
    },
    'review': {
        'prototype_id': {'type': 'string', 'required': True},
        'dimension': {'type': 'string', 'required': True, 'values': ['completeness', 'usability', 'feasibility', 'summary']},
        'score': {'type': 'int', 'required': True, 'min': 0, 'max': 2},
        'verdict': {'type': 'string', 'required': True, 'values': ['pass', 'partial', 'fail']},
        'reviewed_at': {'type': 'datetime', 'required': True},
    },
    'decision': {
        'decision_id': {'type': 'string', 'required': True},
        'prototype_id': {'type': 'string', 'required': True},
        'decision_point': {'type': 'string', 'required': True},
        'chosen_option': {'type': 'string', 'required': True},
        'reasoning': {'type': 'string', 'required': False},
        'decided_at': {'type': 'datetime', 'required': True},
    },
    'submission': {
        'prototype_id': {'type': 'string', 'required': True},
        'target': {'type': 'string', 'required': True, 'values': ['repo', 'public', 'gitlab', 'vercel']},
        'submitted_at': {'type': 'datetime', 'required': True},
        'url': {'type': 'string', 'required': False},
    },
}

FRONTMATTER_RE = re.compile(r'^---\n(.*?)\n---\n', re.DOTALL)


def read_frontmatter(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}
    fm_text = match.group(1)
    result = {}
    for line in fm_text.strip().split('\n'):
        if ':' in line:
            key, _, value = line.partition(':')
            key = key.strip()
            value = value.strip()
            if value.lower() == 'null' or value == '':
                value = None
            elif value.lower() in ('true', 'false'):
                value = value.lower() == 'true'
            elif value.isdigit():
                value = int(value)
            result[key] = value
    return result


def set_frontmatter(filepath, updates):
    with open(filepath, 'r') as f:
        content = f.read()

    match = FRONTMATTER_RE.match(content)
    if match:
        fm_text = match.group(1)
        body = content[match.end():]
        existing = {}
        for line in fm_text.strip().split('\n'):
            if ':' in line:
                key, _, value = line.partition(':')
                existing[key.strip()] = value.strip()
    else:
        existing = {}
        body = content

    existing.update(updates)

    fm_lines = ['---']
    for key, value in existing.items():
        if value is None:
            fm_lines.append(f'{key}: null')
        else:
            fm_lines.append(f'{key}: {value}')
    fm_lines.append('---')

    with open(filepath, 'w') as f:
        f.write('\n'.join(fm_lines) + '\n' + body)


def show_schema(schema_type):
    if schema_type not in SCHEMAS:
        print(f'Unknown schema type: {schema_type}', file=sys.stderr)
        print(f'Available: {", ".join(SCHEMAS.keys())}', file=sys.stderr)
        sys.exit(1)
    print(json.dumps(SCHEMAS[schema_type], indent=2, default=str))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == 'read':
        if len(sys.argv) < 3:
            print('Usage: frontmatter.py read <file>', file=sys.stderr)
            sys.exit(1)
        result = read_frontmatter(sys.argv[2])
        print(json.dumps(result, indent=2, default=str))

    elif command == 'set':
        if len(sys.argv) < 4:
            print('Usage: frontmatter.py set <file> key=value [key=value ...]', file=sys.stderr)
            sys.exit(1)
        filepath = sys.argv[2]
        updates = {}
        for arg in sys.argv[3:]:
            key, _, value = arg.partition('=')
            if value.lower() == 'null':
                value = None
            updates[key] = value
        set_frontmatter(filepath, updates)

    elif command == 'schema':
        if len(sys.argv) < 3:
            print('Usage: frontmatter.py schema <type>', file=sys.stderr)
            sys.exit(1)
        show_schema(sys.argv[2])

    else:
        print(f'Unknown command: {command}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
