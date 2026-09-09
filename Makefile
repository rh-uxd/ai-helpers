.PHONY: validate lint security scaffold skill-audit skill-audit-verify help docs

export SKILLS BASE_SHA NO_WATERMARK

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

validate: ## Run manifest and skill validation (same as CI)
	@bash scripts/validate-manifests.sh
	@bash scripts/validate-skills.sh

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

skill-audit: ## Audit changed skills automatically; optionally pass SKILLS="path/to/SKILL.md"
	@bash scripts/audit-skill-quality.sh

skill-audit-verify: ## Verify audit watermark: make skill-audit-verify BASE_SHA=<sha>
ifndef BASE_SHA
	$(error BASE_SHA is required. Usage: make skill-audit-verify BASE_SHA=<sha>)
endif
	@bash scripts/verify-skill-audit.sh

scaffold: ## Scaffold a new skill: make scaffold PLUGIN=pf-react SKILL=pf-my-skill
ifndef PLUGIN
	$(error PLUGIN is required. Usage: make scaffold PLUGIN=pf-react SKILL=pf-my-skill)
endif
ifndef SKILL
	$(error SKILL is required. Usage: make scaffold PLUGIN=pf-react SKILL=pf-my-skill)
endif
	@bash scripts/scaffold-skill.sh $(PLUGIN) $(SKILL)
