#!/usr/bin/env python3
"""Regression checks for eval selection and ungraded reporting.

Run with Python + PyYAML and Bash 4+ on PATH (or set TEST_BASH).
No git mutations, model calls or network access.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
BASH = os.environ.get('TEST_BASH', shutil.which('bash'))
A11Y = {f'uxd-a11y-{name}' for name in
        ('source-audit', 'keyboard-audit', 'review', 'design-review', 'test-gen')}


class EvalScripts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        major = subprocess.check_output([BASH, '-c', 'echo "${BASH_VERSINFO[0]}"'], text=True)
        if int(major) < 4:
            raise RuntimeError('Bash 4+ required; set TEST_BASH to an installed compatible executable')

    def detect(self, paths=(), args=()):
        with tempfile.TemporaryDirectory() as tmp:
            gh = Path(tmp) / 'gh'
            gh.write_text('#!/bin/sh\nprintf "%s\\n" "$TEST_CHANGED_FILES"\n')
            gh.chmod(0o755)
            env = dict(os.environ, PATH=tmp + os.pathsep + os.environ['PATH'],
                       GITHUB_EVENT_NAME='pull_request', PR_NUMBER='1',
                       TEST_CHANGED_FILES='\n'.join(paths))
            output = subprocess.check_output(
                [BASH, str(ROOT / 'scripts/detect-changed-skills.sh'), *args],
                cwd=ROOT, env=env, text=True)
            fields = dict(line.split('=', 1) for line in output.splitlines())
            skills = json.loads(fields['skills'])
            self.assertEqual(len(skills), len(set(skills)))
            self.assertEqual(fields['has_evals'], str(bool(skills)).lower())
            return set(skills)

    def test_reference_only_selects_all_five(self):
        self.assertEqual(self.detect(['plugins/uxd-a11y/references/reporting.md']), A11Y)

    def test_deleted_reference_also_selects_dependents(self):
        self.assertEqual(self.detect(['plugins/uxd-a11y/references/deleted.md']), A11Y)

    def test_reference_and_skill_changes_are_deduplicated(self):
        self.assertEqual(self.detect(['plugins/uxd-a11y/references/test-recipes.md',
                                     'plugins/uxd-a11y/skills/uxd-a11y-review/SKILL.md']), A11Y)

    def test_direct_skill_keeps_narrow_selection(self):
        self.assertEqual(self.detect(['plugins/uxd-a11y/skills/uxd-a11y-review/SKILL.md']),
                         {'uxd-a11y-review'})

    def test_unrelated_changes_and_empty_diff_select_none(self):
        for paths in [[], ['README.md'], ['plugins/another/references/example.md']]:
            with self.subTest(paths=paths):
                self.assertEqual(self.detect(paths), set())

    def test_explicit_selection_is_preserved(self):
        self.assertEqual(self.detect(args=['--skill', 'uxd-a11y-test-gen']), {'uxd-a11y-test-gen'})
        self.assertEqual(self.detect(args=['--skill', 'nonexistent-test-skill']), set())

    def report(self, judges, skipped):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, 'summary.yaml').write_text(json.dumps({'judges': judges, 'per_case': {}}))
            env = dict(os.environ, EVAL_LLM_JUDGES_SKIPPED=str(skipped).lower())
            return subprocess.check_output(
                [BASH, str(ROOT / 'scripts/parse-eval-results.sh'), tmp],
                cwd=ROOT, env=env, text=True)

    def test_disabled_llm_judges_do_not_report_overall_pass(self):
        for judges in [{}, {'code-check': {'pass_rate': 1.0}}, {'llm-check': {'pass_rate': None}}]:
            with self.subTest(judges=judges):
                output = self.report(judges, True)
                self.assertIn('Overall: **UNGRADED for LLM correctness**', output)
                self.assertNotIn('Result: **PASS**', output)
                self.assertNotIn('Overall: **PASS**', output)

    def test_code_failure_still_fails_when_llm_judges_skipped(self):
        self.assertIn('Overall: **FAIL**', self.report({'a-skipped': {'pass_rate': None}, 'code-check': {'pass_rate': 0.0}}, True))

    def test_existing_graded_report_is_preserved(self):
        self.assertIn('Overall: **PASS**', self.report({'judge': {'pass_rate': 1.0}}, False))


if __name__ == '__main__':
    unittest.main()
