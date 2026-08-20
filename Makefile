.PHONY: validate lint security scaffold help docs mlflow-env mlflow-smoke mlflow-smoke-all test-subskills test-subskills-mlflow

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
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

security: ## Run AI Guardian security scan (zero-install via uvx)
	@command -v uvx >/dev/null 2>&1 || { \
		echo "Error: uvx not found. Install uv: https://docs.astral.sh/uv/getting-started/installation/"; \
		exit 1; \
	}
	@echo "Running AI Guardian..."
	@uvx ai-guardian scan plugins/ --exclude '**/eval/cases/**'

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

# ── MLflow / Eval Pipeline ──────────────────────────────────────────

EVAL_SCRIPTS = plugins/uxd-workshop/skills/uxd-prototype-evaluate/scripts

mlflow-env: ## Print export MLFLOW_TRACKING_URI from env or product overlay
	@uri="$${MLFLOW_TRACKING_URI:-$$(node $(EVAL_SCRIPTS)/overlay-get.js mlflow.tracking_uri 2>/dev/null)}"; \
	if [ -z "$$uri" ]; then \
		echo 'Set MLFLOW_TRACKING_URI or mlflow.tracking_uri in product-overlay.local.yaml'; \
		exit 1; \
	fi; \
	echo "export MLFLOW_TRACKING_URI=$$uri"; \
	echo 'unset MLFLOW_TRACKING_AUTH'

SCORERS ?= pipeline-output
MODEL ?= recommended-mix
mlflow-smoke: ## Run eval scorers for one prototype: make mlflow-smoke KEY=PROJ-298
	@if [ -z "$(KEY)" ]; then echo "Usage: make mlflow-smoke KEY=PROJ-298"; exit 1; fi
	@test -d .artifacts/$(KEY) || (echo "Missing .artifacts/$(KEY)"; exit 1)
	@echo "MLFLOW_TRACKING_URI=$${MLFLOW_TRACKING_URI:-http://127.0.0.1:5000}"
	uv run python3 $(EVAL_SCRIPTS)/mlflow-trace-eval.py \
		.artifacts/$(KEY)/ \
		--model $(MODEL) \
		--prototype-key $(KEY) \
		--experiment uxd-prototype-evaluate \
		--scorers $(SCORERS) \
		$(if $(SKILLS),--skills $(SKILLS),)

mlflow-smoke-all: ## Run all scorers for one prototype: make mlflow-smoke-all KEY=PROJ-298
	@$(MAKE) mlflow-smoke KEY=$(KEY) SCORERS=all MODEL=$(MODEL) SKILLS="$(SKILLS)"

EVAL_TESTS = plugins/uxd-workshop/skills/uxd-prototype-evaluate/tests

test-subskills: ## Run all subskill validation tests against fixtures
	bash $(EVAL_TESTS)/run-script-tests.sh

test-subskills-mlflow: ## Run subskill tests with MLflow tracing: make test-subskills-mlflow KEY=PROJ-298
	@$(MAKE) mlflow-smoke KEY=$(KEY) SCORERS="pipeline-output report-rendering script-tests" MODEL=$(MODEL)
