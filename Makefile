.PHONY: validate validate-evals test-evaluator lint security scaffold help docs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

validate: ## Run all repository validation, including eval configuration checks
	@bash scripts/validate-manifests.sh
	@bash scripts/validate-skills.sh
	@$(MAKE) validate-evals

validate-evals: ## Validate eval configuration structure
	@python3 scripts/lint-evals.py

test-evaluator: ## Run offline evaluator and publisher contract regressions
	@bash plugins/uxd-prototype/skills/uxd-prototype-evaluate/tests/test-resolve-prototype-url.sh
	@node --test plugins/uxd-prototype/skills/uxd-prototype-evaluate/tests/canonical-contracts.test.js
	@python3 plugins/uxd-prototype/skills/uxd-prototype-evaluate/tests/test-publish-eval.py

lint: ## Run skillsaw content linter (zero-install via uvx)
	@command -v uvx >/dev/null 2>&1 || { \
		echo "Error: uvx not found. Install uv: https://docs.astral.sh/uv/getting-started/installation/"; \
		exit 1; \
	}
	@echo "Running skillsaw..."
	@uvx skillsaw lint .

security: ## Run AI Guardian security scan (zero-install via uvx)
	@command -v uvx >/dev/null 2>&1 || { \
		echo "Error: uvx not found. Install uv: https://docs.astral.sh/uv/getting-started/installation/"; \
		exit 1; \
	}
	@echo "Running AI Guardian..."
	@uvx ai-guardian scan plugins/ --exclude '**/eval/cases/**'

docs: ## Regenerate PLUGINS.md, README plugin table, CONTRIBUTING-SKILLS.md, badge counts, and per-plugin READMEs
	@bash scripts/generate-plugins-md.sh

scaffold: ## Scaffold a new skill: make scaffold PLUGIN=pf-react SKILL=pf-my-skill
ifndef PLUGIN
	$(error PLUGIN is required. Usage: make scaffold PLUGIN=pf-react SKILL=pf-my-skill)
endif
ifndef SKILL
	$(error SKILL is required. Usage: make scaffold PLUGIN=pf-react SKILL=pf-my-skill)
endif
	@bash scripts/scaffold-skill.sh $(PLUGIN) $(SKILL)
