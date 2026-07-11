#!/usr/bin/env python3
"""
Apply prototype scorer results to review frontmatter files.

Usage:
    python3 scripts/score_prototype.py <prototype-id> [--reviews-dir .artifacts/<id>/reviews]

Reads individual dimension review files ({dimension}.md), extracts
scores from frontmatter, computes the aggregate verdict, and writes a
summary review file (summary.md).

Scoring:
    - Each dimension: 0-2 (fail, partial, pass)
    - Total possible: 6
    - Pass threshold: 5+ with no zeros
"""

import sys
import os
import json
import datetime

sys.path.insert(0, os.path.dirname(__file__))
from frontmatter import read_frontmatter, set_frontmatter

DIMENSIONS = ['completeness', 'usability', 'feasibility']
PASS_THRESHOLD = 5
MIN_PER_DIMENSION = 1


def score_prototype(prototype_id, reviews_dir=None):
    if reviews_dir is None:
        reviews_dir = f'.artifacts/{prototype_id}/reviews'
    scores = {}
    missing = []

    for dim in DIMENSIONS:
        review_file = os.path.join(reviews_dir, f'{dim}.md')
        if not os.path.exists(review_file):
            missing.append(dim)
            continue

        fm = read_frontmatter(review_file)
        score = fm.get('score')
        if score is not None:
            scores[dim] = int(score)
        else:
            missing.append(dim)

    if missing:
        print(f'Warning: Missing reviews for: {", ".join(missing)}', file=sys.stderr)

    total = sum(scores.values())
    has_zero = any(v == 0 for v in scores.values())
    verdict = 'rubric-pass' if total >= PASS_THRESHOLD and not has_zero else 'needs-attention'

    summary = {
        'prototype_id': prototype_id,
        'dimension': 'summary',
        'total_score': total,
        'max_score': len(DIMENSIONS) * 2,
        'verdict': verdict,
        'reviewed_at': datetime.datetime.utcnow().isoformat() + 'Z',
        'dimensions': scores,
        'missing_dimensions': missing,
    }

    summary_file = os.path.join(reviews_dir, 'summary.md')
    os.makedirs(reviews_dir, exist_ok=True)

    with open(summary_file, 'w') as f:
        f.write('---\n')
        f.write(f'prototype_id: {prototype_id}\n')
        f.write(f'dimension: summary\n')
        f.write(f'total_score: {total}\n')
        f.write(f'max_score: {len(DIMENSIONS) * 2}\n')
        f.write(f'verdict: {verdict}\n')
        f.write(f'reviewed_at: {summary["reviewed_at"]}\n')
        f.write('---\n\n')
        f.write(f'# Prototype Review Summary: {prototype_id}\n\n')
        f.write(f'**Verdict: {verdict.upper()}** ({total}/{len(DIMENSIONS) * 2})\n\n')
        f.write('| Dimension | Score | Verdict |\n')
        f.write('|-----------|-------|---------|\n')
        for dim in DIMENSIONS:
            if dim in scores:
                s = scores[dim]
                v = 'pass' if s == 2 else 'partial' if s == 1 else 'fail'
                f.write(f'| {dim.replace("_", " ").title()} | {s}/2 | {v} |\n')
            else:
                f.write(f'| {dim.replace("_", " ").title()} | - | missing |\n')
        if missing:
            f.write(f'\n**Missing reviews:** {", ".join(missing)}\n')

    print(json.dumps(summary, indent=2))
    return summary


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    prototype_id = sys.argv[1]
    reviews_dir = None

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--reviews-dir' and i + 1 < len(sys.argv):
            reviews_dir = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    score_prototype(prototype_id, reviews_dir)


if __name__ == '__main__':
    main()
