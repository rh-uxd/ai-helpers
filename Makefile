.PHONY: validate lint scaffold help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

validate: ## Run manifest and doc validation (same as CI)
	@bash scripts/validate-manifests.sh
	@bash scripts/validate-skills.sh
	@bash scripts/generate-plugins-md.sh
	@echo "Checking generated docs are up to date..."
	@if ! git diff --quiet PLUGINS.md README.md CONTRIBUTING-SKILLS.md \
		plugins/*/README.md plugins/*/*/README.md 2>/dev/null; then \
		echo "Error: Generated docs are out of date. Run 'make docs' and commit the result."; \
		exit 1; \
	fi

lint: ## Run skillsaw content linter (zero-install via uvx)
	@command -v uvx >/dev/null 2>&1 || { \
		echo "Error: uvx not found. Install uv: https://docs.astral.sh/uv/getting-started/installation/"; \
		exit 1; \
	}
	@echo "Running skillsaw..."
	@uvx skillsaw lint .

docs: ## Regenerate PLUGINS.md, README plugin table, and CONTRIBUTING-SKILLS.md
	@bash scripts/generate-plugins-md.sh

scaffold: ## Scaffold a new skill: make scaffold PLUGIN=pf-react SKILL=pf-my-skill
ifndef PLUGIN
	$(error PLUGIN is required. Usage: make scaffold PLUGIN=pf-react SKILL=pf-my-skill)
endif
ifndef SKILL
	$(error SKILL is required. Usage: make scaffold PLUGIN=pf-react SKILL=pf-my-skill)
endif
	@bash scripts/scaffold-skill.sh $(PLUGIN) $(SKILL)
