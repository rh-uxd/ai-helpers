#!/usr/bin/env python3
"""
Generate an HTML report summarizing a prototype-creator pipeline run.

Usage:
    python3 scripts/generate-report.py [--output .artifacts/pipeline-report.html]

Reads all prototype and review artifacts, generates a summary table
with drill-down detail links.
"""

import sys
import os
import json
import datetime
import glob

sys.path.insert(0, os.path.dirname(__file__))
from frontmatter import read_frontmatter

VERDICT_COLORS = {
    'rubric-pass': '#22c55e',
    'needs-attention': '#f59e0b',
}

SCORE_COLORS = {
    0: '#ef4444',
    1: '#f59e0b',
    2: '#22c55e',
}


def gather_prototypes(artifacts_dir='.artifacts'):
    prototypes = []
    if not os.path.exists(artifacts_dir):
        return prototypes

    for folder in sorted(os.listdir(artifacts_dir)):
        folder_path = os.path.join(artifacts_dir, folder)
        if not os.path.isdir(folder_path):
            continue

        metadata_file = os.path.join(folder_path, 'metadata.json')
        index_file = os.path.join(folder_path, 'prototype', 'index.html')

        proto = {
            'id': folder,
            'title': folder,
            'has_prototype': os.path.exists(index_file),
            'review': None,
            'scores': {},
        }

        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                meta = json.load(f)
                proto['title'] = meta.get('name', folder)
                proto['source_rfe'] = meta.get('source_rfe', '')

        summary_file = os.path.join(folder_path, 'reviews', 'summary.md')
        if os.path.exists(summary_file):
            fm = read_frontmatter(summary_file)
            proto['review'] = fm

        prototypes.append(proto)

    return prototypes


def generate_html(prototypes, output_path):
    now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')

    rows = []
    for p in prototypes:
        verdict = p.get('review', {}).get('verdict', '-') if p.get('review') else '-'
        total = p.get('review', {}).get('total_score', '-') if p.get('review') else '-'
        color = VERDICT_COLORS.get(verdict, '#6b7280')

        rows.append(f'''
        <tr>
            <td><code>{p['id']}</code></td>
            <td>{p['title']}</td>
            <td>{p.get('source_rfe', '-')}</td>
            <td style="text-align:center">{total}</td>
            <td><span style="color:{color};font-weight:600">{verdict}</span></td>
        </tr>''')

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Prototype Creator Pipeline Report</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #0f172a; color: #e2e8f0; }}
  h1 {{ color: #f8fafc; margin-bottom: 4px; }}
  .timestamp {{ color: #94a3b8; font-size: 14px; margin-bottom: 24px; }}
  table {{ border-collapse: collapse; width: 100%; margin-top: 16px; }}
  th {{ background: #1e293b; color: #94a3b8; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }}
  td {{ padding: 10px 14px; border-bottom: 1px solid #1e293b; }}
  tr:hover {{ background: #1e293b; }}
  code {{ background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 13px; }}
  .summary {{ display: flex; gap: 24px; margin: 16px 0; }}
  .stat {{ background: #1e293b; padding: 16px 24px; border-radius: 8px; }}
  .stat-value {{ font-size: 28px; font-weight: 700; color: #f8fafc; }}
  .stat-label {{ font-size: 12px; color: #94a3b8; text-transform: uppercase; }}
</style>
</head>
<body>
<h1>Prototype Creator Pipeline Report</h1>
<div class="timestamp">Generated {now}</div>

<div class="summary">
  <div class="stat">
    <div class="stat-value">{len(prototypes)}</div>
    <div class="stat-label">Prototypes</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:#22c55e">{sum(1 for p in prototypes if p.get('review', {}).get('verdict') == 'rubric-pass')}</div>
    <div class="stat-label">Passing</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:#f59e0b">{sum(1 for p in prototypes if p.get('review', {}).get('verdict') == 'needs-attention')}</div>
    <div class="stat-label">Needs Attention</div>
  </div>
  <div class="stat">
    <div class="stat-value">{sum(1 for p in prototypes if not p.get('review'))}</div>
    <div class="stat-label">Unreviewed</div>
  </div>
</div>

<table>
<thead>
  <tr>
    <th>ID</th>
    <th>Title</th>
    <th>Source RFE</th>
    <th>Score</th>
    <th>Verdict</th>
  </tr>
</thead>
<tbody>
  {''.join(rows)}
</tbody>
</table>
</body>
</html>'''

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(html)

    print(f'Report written to {output_path}')


def main():
    output = '.artifacts/pipeline-report.html'

    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == '--output' and i + 1 < len(sys.argv):
            output = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    prototypes = gather_prototypes()
    generate_html(prototypes, output)


if __name__ == '__main__':
    main()
