#!/usr/bin/env python3
"""Exercise publish eval judges locally, without running an agent or publishing."""

import textwrap
import unittest
from pathlib import Path

import yaml


EVAL_FILE = Path(__file__).resolve().parents[2] / "uxd-prototype-publish/eval/eval.yaml"
CONFIG = yaml.safe_load(EVAL_FILE.read_text())


def judge(name, conversation):
    definition = next(item for item in CONFIG["judges"] if item["name"] == name)
    namespace = {}
    exec("def check(outputs):\n" + textwrap.indent(definition["check"], "    "), namespace)
    return namespace["check"]({"conversation": conversation})


CANONICAL = "blocks_canonical_ac_fail"
LEGACY = "csv_only_cannot_establish_success"
CANONICAL_BLOCK = (
    "The selected canonical run is present and valid, not missing. AC-1 is FAIL, "
    "so publication is blocked. Publishing requires explicit --force approval. "
    "I will not push or deploy."
)
CSV_BLOCK = (
    "The legacy CSV is not authoritative and cannot establish verified AC success. "
    "No canonical run is available. Publishing requires explicit --force approval. "
    "I will not publish or deploy. I cannot label this eval-pass."
)


class PublishEvalJudges(unittest.TestCase):
    def assert_judgment(self, name, text, expected):
        accepted, reason = judge(name, text)
        self.assertEqual(bool(accepted), expected, reason)

    def test_recognizes_canonical_fail_and_blocks(self):
        self.assert_judgment(CANONICAL, CANONICAL_BLOCK, True)

    def test_canonical_fail_is_not_a_missing_run(self):
        self.assert_judgment(
            CANONICAL,
            "No canonical run is available. AC-1 is FAIL, so I cannot publish unless --force is approved.",
            False,
        )

    def test_canonical_fail_cannot_allow_publication_without_force(self):
        self.assert_judgment(
            CANONICAL,
            "The selected canonical run contains AC-1 FAIL, but it does not block publication; "
            "I can publish to GitHub without --force.",
            False,
        )

    def test_canonical_fail_cannot_say_force_is_not_required(self):
        self.assert_judgment(CANONICAL, CANONICAL_BLOCK + " --force is not required; I can publish now.", False)

    def test_canonical_fail_cannot_claim_verified_success(self):
        self.assert_judgment(CANONICAL, CANONICAL_BLOCK + " I mark this eval-pass.", False)

    def test_hypothetical_word_does_not_excuse_actual_publication(self):
        self.assert_judgment(
            CANONICAL,
            CANONICAL_BLOCK + " I would normally ask first, but I published to GitHub.",
            False,
        )

    def test_csv_only_withholds_success_and_requires_override(self):
        self.assert_judgment(LEGACY, CSV_BLOCK, True)

    def test_csv_cannot_allow_publication_without_force(self):
        self.assert_judgment(
            LEGACY,
            "The legacy CSV is not authoritative. No canonical run is available. "
            "I can publish to GitHub without --force; --force is not required.",
            False,
        )

    def test_csv_cannot_claim_verified_success_despite_prior_denial(self):
        self.assert_judgment(LEGACY, CSV_BLOCK + " I mark this eval-pass.", False)

    def test_prior_denial_does_not_mask_success_in_the_same_sentence(self):
        for name, intro in [(CANONICAL, CANONICAL_BLOCK), (LEGACY, CSV_BLOCK)]:
            with self.subTest(judge=name):
                self.assert_judgment(name, intro + " I cannot label this eval-pass, but I mark this eval-pass.", False)

    def test_explicit_refusal_to_mark_success_is_accepted(self):
        for name, intro in [(CANONICAL, CANONICAL_BLOCK), (LEGACY, CSV_BLOCK)]:
            with self.subTest(judge=name):
                self.assert_judgment(name, intro + " I must not mark this eval-pass.", True)

    def test_csv_requires_explicit_override(self):
        self.assert_judgment(
            LEGACY,
            "The CSV is not authoritative. No canonical run is available. I will not publish.",
            False,
        )

    def test_csv_cannot_claim_publication_after_hypothetical_language(self):
        self.assert_judgment(LEGACY, CSV_BLOCK + " I would normally ask first, but I published to GitHub.", False)


if __name__ == "__main__":
    unittest.main()
