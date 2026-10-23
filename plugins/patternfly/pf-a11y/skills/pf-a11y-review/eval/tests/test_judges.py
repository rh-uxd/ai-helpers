#!/usr/bin/env python3
"""Regression tests for deterministic pf-a11y-review eval judges."""

import json
import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

import yaml


EVAL_PATH = Path(__file__).parents[1] / "eval.yaml"


def load_judge(name):
    data = yaml.safe_load(EVAL_PATH.read_text())
    return next(judge["check"] for judge in data["judges"] if judge["name"] == name)


def evaluate(name, text):
    source = load_judge(name)
    program = (
        "import json, sys\n"
        "def check(outputs, arguments):\n"
        + textwrap.indent(source, "    ")
        + "\nresult = check(json.loads(sys.stdin.read()), {})\n"
        + "print(json.dumps(result))\n"
    )
    completed = subprocess.run(
        [sys.executable, "-c", program],
        input=json.dumps({"conversation": text, "files": {}}),
        capture_output=True,
        check=True,
        text=True,
    )
    return json.loads(completed.stdout)[0]


class MediaConditionJudgeTests(unittest.TestCase):
    prefix = "Text resized to 200%. Reflow at 320 CSS px. "

    def test_accepts_distinction_in_reverse_term_order(self):
        text = self.prefix + (
            "Browser zoom and text resizing are not equivalent to device pixel ratio "
            "(deviceScaleFactor)."
        )
        self.assertTrue(evaluate("distinguishes_media_conditions", text))

    def test_rejects_denial_of_distinction(self):
        text = self.prefix + (
            "Device pixel ratio is not different from browser zoom or text resize."
        )
        self.assertFalse(evaluate("distinguishes_media_conditions", text))


class MissingCapabilityJudgeTests(unittest.TestCase):
    prefix = "Browser unavailable. Keyboard, media and semantic-tree checks: Not tested. "

    def test_accepts_warning_against_false_pass(self):
        text = self.prefix + "Do not infer an overall pass from a clean axe unit-test result."
        self.assertTrue(evaluate("reports_missing_capabilities_honestly", text))

    def test_rejects_affirmative_false_pass_in_either_order(self):
        text = self.prefix + "The clean axe unit-test result proves the page is fully accessible."
        self.assertFalse(evaluate("reports_missing_capabilities_honestly", text))


class ProductOverlayJudgeTests(unittest.TestCase):
    prefix = (
        "The page registry stays in the product overlay. "
        "axe, keyboard, media matrix and semantic tree remain shared. "
    )

    def test_accepts_positive_approval_gate(self):
        text = self.prefix + "Only create issues after explicit user approval."
        self.assertTrue(evaluate("preserves_product_overlay_boundary", text))

    def test_rejects_unsafe_approval_wording(self):
        text = self.prefix + "Create issues without explicit user approval."
        self.assertFalse(evaluate("preserves_product_overlay_boundary", text))


if __name__ == "__main__":
    unittest.main()
