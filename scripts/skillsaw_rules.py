"""Repository-specific Skillsaw rules for UXD AI Helpers skills."""

import json
import re
from pathlib import Path
from typing import List

from skillsaw import RepositoryContext, Rule, RuleViolation, Severity
from skillsaw.blocks import SkillBlock


ACTION_VERBS = (
    "Analyze",
    "Audit",
    "Build",
    "Check",
    "Clone",
    "Conduct",
    "Create",
    "Deploy",
    "Diff",
    "Enable",
    "Evaluate",
    "Find",
    "Flag",
    "Generate",
    "Identify",
    "Integrate",
    "Map",
    "Produce",
    "Publish",
    "Recommend",
    "Review",
    "Run",
    "Scan",
    "Scaffold",
    "Summarize",
    "Test",
    "Update",
    "Validate",
    "Write",
)


class UxdSkillQualityRule(Rule):
    """Enforce UXD marketplace conventions not covered by built-in rules."""

    repo_types = ("agentskills",)

    @property
    def rule_id(self) -> str:
        return "uxd-skill-quality"

    @property
    def description(self) -> str:
        return "UXD skills follow repository naming, metadata, content, and eval conventions"

    def default_severity(self) -> Severity:
        return Severity.ERROR

    def check(self, context: RepositoryContext) -> List[RuleViolation]:
        violations = []
        for skill in context.lint_tree.find(SkillBlock):
            violations.extend(self._check_skill(skill))
        return violations

    def _check_skill(self, skill: SkillBlock) -> List[RuleViolation]:
        violations = []
        path = skill.path
        if "plugins" not in path.parts:
            return violations
        name = skill.field_value("name", "")
        description = skill.field_value("description", "")
        body = skill.body_text or ""
        lines = path.read_text(encoding="utf-8").splitlines()

        def report(message: str, line: int = 1) -> None:
            violations.append(
                self.violation(
                    message,
                    file_path=path,
                    line=line,
                    fingerprint_discriminator=message,
                )
            )

        if not isinstance(name, str) or not name:
            name = ""
        if name != path.parent.name:
            report("frontmatter name must match its directory", skill.key_line("name") or 1)
        if not re.match(r"^(pf|uxd)-", name):
            report("name must start with pf- or uxd-", skill.key_line("name") or 1)

        if not isinstance(description, str):
            description = ""
        if not re.match(rf"^(?:{'|'.join(ACTION_VERBS)})\b", description):
            report("description should start with an action verb", skill.key_line("description") or 1)
        if "Use when" not in description:
            report("description should include a Use when context", skill.key_line("description") or 1)

        for field in ("audience", "inputs", "outputs"):
            if not skill.field_value(field):
                report(f"missing {field} metadata", skill.key_line(field) or 1)

        if len(lines) > 500:
            report(f"skill exceeds 500 lines ({len(lines)})", 501)
        if not re.search(r"^##+ .*example|^##+ output", body, re.IGNORECASE | re.MULTILINE):
            report("missing an example or output section")
        if "```" not in body:
            report("missing a fenced output example")

        if self._is_consumer_skill(path):
            eval_dir = path.parent / "eval"
            eval_file = eval_dir / "eval.yaml"
            if not eval_file.is_file():
                report("consumer skill is missing eval/eval.yaml")
            else:
                eval_text = eval_file.read_text(encoding="utf-8")
                if not re.search(r"^dataset:", eval_text, re.MULTILINE):
                    violations.append(
                        self.violation(
                            "missing dataset configuration",
                            file_path=eval_file,
                            line=1,
                            fingerprint_discriminator="missing dataset configuration",
                        )
                    )
                cases_dir = eval_dir / "cases"
                if not cases_dir.is_dir():
                    violations.append(
                        self.violation(
                            "missing eval/cases directory",
                            file_path=eval_file,
                            line=1,
                            fingerprint_discriminator="missing eval/cases directory",
                        )
                    )
                elif not any(item.is_dir() for item in cases_dir.iterdir()):
                    violations.append(
                        self.violation(
                            "eval/cases has no test cases",
                            file_path=eval_file,
                            line=1,
                            fingerprint_discriminator="eval/cases has no test cases",
                        )
                    )

        return violations

    @staticmethod
    def _is_consumer_skill(path: Path) -> bool:
        plugin_dir = path.parent.parent.parent
        manifest = plugin_dir / ".claude-plugin" / "plugin.json"
        try:
            metadata = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return True
        return metadata.get("category") != "workshop"
