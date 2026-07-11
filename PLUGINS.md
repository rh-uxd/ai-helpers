# Available Plugins

Quick reference of all plugins and what they contain. This file is auto-generated — do not edit manually.

## Table of Contents

- [uxd-workshop](#uxd-workshop) — UXD team tools and skill incubator — prototyping, research, design review, team workflows
- [pf-a11y](#pf-a11y) — Accessibility auditing, reporting, and documentation
- [pf-code-review](#pf-code-review) — Code review and quality — adversarial review, security patterns
- [pf-design-audit](#pf-design-audit) — Design audit — validate existing code and designs against PatternFly standards
- [pf-design-guide](#pf-design-guide) — Design guide — component selection, interaction patterns, AI experience patterns, Figma design creation
- [pf-mcp](#pf-mcp) — PatternFly MCP server — provides component documentation, design token lookup, and accessibility guidance via the Model Context Protocol
- [pf-migration](#pf-migration) — PF version migration — breaking change detection, class scanning, upgrade planning
- [pf-react](#pf-react) — React component development — coding standards, testing, and structure
- [pf-workshop](#pf-workshop) — PatternFly team tools and skill incubation — issue triage, release management, codebase auditing, new skill development

---

### uxd-workshop

UXD team tools and skill incubator — prototyping, research, design review, team workflows

| Skill | Description |
|-------|-------------|
| `uxd-evaluate-design-heuristics` | Score a design against accessibility, visual hierarchy, content, and state coverage heuristics. |
| `uxd-figma-read` | Retrieve design context from a Figma file. |
| `uxd-prototype-create` | Create or refine a UX prototype from various input sources — a Jira ticket, Figma design, feature description, or just an idea. |
| `uxd-prototype-evaluate` | Evaluate a prototype's quality through rubric scoring, simulated usability testing, and desirability studies. |
| `uxd-prototype-publish` | Publish a prototype to a target destination — push to a git repo as a merge request, or deploy a sanitized copy to GitHub Pages, GitLab Pages, or Vercel. |
| `uxd-research-heuristic-eval` | Conduct a heuristic evaluation of a prototype or interface using three independent expert evaluators. |

| Agent | Description |
|-------|-------------|
| `uxd-assist` | UXD workflow routing — maps design review, research, prototyping, and evaluation needs to the right UXD sub-skills. |


<br>

### pf-a11y

Accessibility auditing, reporting, and documentation

No skills or agents yet.


<br>

### pf-code-review

Code review and quality — adversarial review, security patterns

| Agent | Description |
|-------|-------------|
| `pf-assist` | PatternFly development routing — maps code changes, test gaps, scaffolding needs, and design work to the right PF sub-skills. |


<br>

### pf-design-audit

Design audit — validate existing code and designs against PatternFly standards

| Skill | Description |
|-------|-------------|
| `pf-code-token-check` | Detect hardcoded color, spacing, typography, border radius and shadow values that have PF token equivalents and suggest the correct design token replacements. |
| `pf-color-scan` | Find raw color values (hex, rgb, hsl) in code and suggest PatternFly design token replacements. |
| `pf-figma-check` | Check Figma designs against PatternFly v6 standards for colors, typography, spacing, and component usage. |
| `pf-figma-token-check` | Audit designs against the PatternFly 6 token architecture and bridge Figma styles to PF semantic tokens. |
| `pf-icon-finder` | Identify PatternFly icons in Figma mockups and provide the correct React import statements. |


<br>

### pf-design-guide

Design guide — component selection, interaction patterns, AI experience patterns, Figma design creation

| Skill | Description |
|-------|-------------|
| `pf-ai-guide` | Apply Red Hat's AI design language to AI-powered features — chatbots, assistants, generation UIs. |
| `pf-figma-design-mode` | Create and edit Figma design files using PatternFly-approved component libraries. |

| Agent | Description |
|-------|-------------|
| `pf-microcopy` | PatternFly component microcopy standards — button labels, tooltips, alt text, and error messages. |


<br>

### pf-mcp

PatternFly MCP server — provides component documentation, design token lookup, and accessibility guidance via the Model Context Protocol

This plugin provides an MCP server only — no skills or agents. Other plugins declare it as a dependency so the MCP server is installed automatically.


<br>

### pf-migration

PF version migration — breaking change detection, class scanning, upgrade planning

| Skill | Description |
|-------|-------------|
| `pf-css-migration-scan` | Scan code for legacy PatternFly CSS classes and recommend PF6-safe replacements. |
| `pf-react-migration-scan` | Scan code for @patternfly/react-* API breaking changes and produce a markdown report. |


<br>

### pf-react

React component development — coding standards, testing, and structure

| Skill | Description |
|-------|-------------|
| `pf-component-check` | Audit PatternFly React component nesting, wrapper hierarchies, and layout structure. |
| `pf-deploy` | Deploy a PatternFly React project to GitHub Pages using pfcli deploy. |
| `pf-design-comments-setup` | Integrate @patternfly/design-comments into React apps for on-page design feedback, pinned comment threads, GitHub Issues sync, and Jira linking. |
| `pf-import-check` | Audit and fix invalid PatternFly import paths across packages. |
| `pf-project-gen` | Scaffolds PatternFly React projects with PF6-safe dependencies, imports, and starter layout. |
| `pf-test-gen` | Generate a unit test file for a React component using Testing Library. |

| Agent | Description |
|-------|-------------|
| `pf-coding-standards` | PatternFly React coding standards — import patterns, component composition, token usage, and style conventions. |
| `pf-component-structure-audit` | PatternFly React structural composition rules — required hierarchies, wrapper components, and props-vs-children patterns. |
| `pf-unit-test-standards` | PatternFly React unit testing standards — RTL patterns, mock boundaries, coverage expectations, and assertion style. |


<br>

### pf-workshop

PatternFly team tools and skill incubation — issue triage, release management, codebase auditing, new skill development

| Skill | Description |
|-------|-------------|
| `pf-analytics-repo-pruning` | Flag archived or inactive repos in PatternFly Analytics repos.json for removal. |
| `pf-bug-triage` | Triage PatternFly bug reports — assess completeness, suggest fixes, identify affected components, and recommend assignees. |
| `pf-content-review` | Review content against PatternFly and Red Hat voice and tone standards. |
| `pf-create-issue` | Create well-structured GitHub issues for PatternFly repositories with templates, follow-up tracking, and duplicate detection. |
| `pf-css-var-scan` | Analyze --pf- CSS custom property usage and naming patterns in PatternFly SCSS. |
| `pf-duplicate-epic` | Clone a Jira epic from another project into the PF Jira space with back-links and feature attachment. |
| `pf-figma-diff` | Diff Figma designs to identify what changed and generate code update checklists. |
| `pf-modifier-scan` | Analyze PatternFly modifier class (pf-m-*) usage across SCSS files and generate usage reports. |
| `pf-org-version-update` | Update patternfly-org for a new PatternFly release — resolve versions, update package.json and versions.json, and provide build steps. |
| `pf-prototype-mode` | Enable prototype mode for React apps with grayscale styling and a banner overlay. |
| `pf-quarterly-report-gen` | Generate quarterly Jira status reports with RAG assessment, blocker tracking, and next-quarter recommendations. |
| `pf-rhds-icon-finder` | Find Red Hat Design System icons (@rhds/icons) by keyword or use case with visual previews. |
| `pf-semantic-release-debug` | Diagnose and fix semantic-release issues when a specific version is not being released. |
| `pf-summarize-jira-issues` | Summarize your current sprint workload from Jira — assigned issues, contributor roles, and priorities. |
| `pf-summarize-pr-reviews` | Summarize GitHub pull requests awaiting your review with status, age, and priority. |
| `pf-token-build` | Build CSS design tokens for PatternFly core and copy them to the PatternFly repository. |
| `pf-write-example-description` | Write and refine example descriptions for PatternFly.org component and demo pages. |

| Agent | Description |
|-------|-------------|
| `pf-voice-and-tone` | PatternFly and Red Hat voice and tone standards — friendly, approachable, collaborative, inventive. |

