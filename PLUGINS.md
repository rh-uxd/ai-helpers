# Available Plugins

Quick reference of all plugins and what they contain. This file is auto-generated — do not edit manually.

## Table of Contents

- [patternfly](#patternfly) — Everything you need for PatternFly development — React components, design guidance, migration, and MCP docs
- [pf-assist](#pf-assist) — PatternFly skill routing — maps project signals to the right PF sub-skills for compliance, migration, and design audits
- [uxd-assist](#uxd-assist) — UXD skill routing — discover the right skills for research, design review, and prototyping workflows
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

### patternfly

Everything you need for PatternFly development — React components, design guidance, migration, and MCP docs

No skills or agents yet.


<br>

### pf-assist

PatternFly skill routing — maps project signals to the right PF sub-skills for compliance, migration, and design audits

<table>
<tr><th>Agent</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-assist</code></td><td>PatternFly skill routing — maps project signals to the right PF sub-skills.</td><td>stable</td></tr>
</table>


<br>

### uxd-assist

UXD skill routing — discover the right skills for research, design review, and prototyping workflows

<table>
<tr><th>Agent</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>uxd-assist</code></td><td>UXD skill routing — maps task context to the right UXD sub-skills for research, design review, and prototyping.</td><td>stable</td></tr>
</table>


<br>

### uxd-workshop

UXD team tools and skill incubator — prototyping, research, design review, team workflows

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>uxd-design-handoff</code></td><td>Produce an implementation-ready design handoff spec from a validated design.</td><td>stable</td></tr>
<tr><td nowrap><code>uxd-discovery</code></td><td>Produce a structured UX discovery brief from a feature request, Jira issue, or problem statement.</td><td>stable</td></tr>
<tr><td nowrap><code>uxd-evaluate-design-heuristics</code></td><td>Score a design against accessibility, visual hierarchy, content, and state coverage heuristics.</td><td>—</td></tr>
<tr><td nowrap><code>uxd-figma-read</code></td><td>Retrieve design context from a Figma file.</td><td>—</td></tr>
<tr><td nowrap><code>uxd-prototype-create</code></td><td>Create or refine a UX prototype from a Jira ticket, Figma design, feature description, or rough idea.</td><td>stable</td></tr>
<tr><td nowrap><code>uxd-prototype-evaluate</code></td><td>Evaluate a running prototype against a Jira ticket's acceptance criteria, automatically fix what fails, then run persona-based usability walkthroughs.</td><td>stable</td></tr>
<tr><td nowrap><code>uxd-prototype-export</code></td><td>Export a prototype page or journey step as static HTML, a React component tree, or a PatternFly implementation spec, and install the Prototype Bar (Sources, Prototype|Eval, Scenario, Export).</td><td>—</td></tr>
<tr><td nowrap><code>uxd-prototype-publish</code></td><td>Publish a prototype to a git merge request, GitHub Pages, GitLab Pages, or Vercel.</td><td>stable</td></tr>
<tr><td nowrap><code>uxd-research-heuristic-eval</code></td><td>Conduct a heuristic evaluation of a prototype or interface using three independent expert evaluators.</td><td>stable</td></tr>
</table>


<br>

### pf-a11y

Accessibility auditing, reporting, and documentation

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-a11y-audit</code></td><td>Audit PatternFly components and pages against WCAG and ARIA best practices.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-a11y-keyboard</code></td><td>Test keyboard accessibility of PatternFly UIs via live browser interaction.</td><td>stable</td></tr>
</table>


<br>

### pf-code-review

Code review and quality — adversarial review, security patterns

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-review</code></td><td>Run all PatternFly compliance checks on a project — imports, components, colors, legacy CSS, and security.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-security-scan</code></td><td>Scan PatternFly React code for security anti-patterns — XSS via dangerouslySetInnerHTML, unsanitized user input in tooltips/labels, and insecure href patterns.</td><td>stable</td></tr>
</table>


<br>

### pf-design-audit

Design audit — validate existing code and designs against PatternFly standards

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-ai-audit</code></td><td>Audit AI-powered features against Red Hat's AI design language — transparency notices, iconography, chatbot patterns, color and gradient rules.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-color-scan</code></td><td>Find raw color values (hex, rgb, hsl) in code and suggest PatternFly design token replacements.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-css-token-check</code></td><td>Detect hardcoded color, spacing, typography, border radius and shadow values that have PF token equivalents and suggest the correct design token replacements.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-figma-check</code></td><td>Check Figma designs against PatternFly v6 standards for colors, typography, spacing, and component usage.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-figma-token-check</code></td><td>Audit designs against the PatternFly 6 token architecture and bridge Figma styles to PF semantic tokens.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-icon-finder</code></td><td>Identify PatternFly icons in design mockups and provide the correct React import statements.</td><td>stable</td></tr>
</table>


<br>

### pf-design-guide

Design guide — component selection, interaction patterns, AI experience patterns, Figma design creation

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-figma-design-mode</code></td><td>Create and edit Figma design files using PatternFly-approved component libraries.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-screenshot-mapping</code></td><td>Maps screenshots and UI mockups (any fidelity) to PatternFly 6 layout and building-block components.</td><td>stable</td></tr>
</table>

<table>
<tr><th>Agent</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-microcopy</code></td><td>PatternFly component microcopy standards — button labels, tooltips, alt text, and error messages.</td><td>—</td></tr>
</table>


<br>

### pf-mcp

PatternFly MCP server — provides component documentation, design token lookup, and accessibility guidance via the Model Context Protocol

This plugin provides an MCP server only — no skills or agents. Other plugins declare it as a dependency so the MCP server is installed automatically.


<br>

### pf-migration

PF version migration — breaking change detection, class scanning, upgrade planning

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-css-migration-scan</code></td><td>Scan code for legacy PatternFly CSS classes and recommend PF6-safe replacements.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-react-migration-scan</code></td><td>Scan code for @patternfly/react-* API breaking changes and produce a markdown report.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-release-candidate-update</code></td><td>Update @patternfly/* npm dependencies to the latest release candidate versions.</td><td>stable</td></tr>
</table>


<br>

### pf-react

React component development — coding standards, testing, and structure

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-chart-gen</code></td><td>Generate PatternFly chart components with theming, responsive sizing, and accessibility.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-component-check</code></td><td>Audit PatternFly React component nesting, wrapper hierarchies, and layout structure.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-component-reuse-check</code></td><td>Detects custom React components in newly created or modified (uncommitted) code that overlap with PatternFly React components, suggests the PatternFly equivalent, and can replace the custom component then build to verify.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-deploy</code></td><td>Deploy a PatternFly React project to GitHub Pages using pfcli deploy.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-design-comments-setup</code></td><td>Integrate @patternfly/design-comments into React apps for on-page design feedback, pinned comment threads, GitHub Issues sync, and Jira linking.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-form-gen</code></td><td>Generate PatternFly form components with validation, layout, and accessibility.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-import-check</code></td><td>Audit and fix invalid PatternFly import paths across packages.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-project-gen</code></td><td>Scaffolds PatternFly React projects with PF6-safe dependencies, imports, and starter layout.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-table-gen</code></td><td>Generate PatternFly table components with sorting, filtering, pagination, and expandable rows.</td><td>stable</td></tr>
<tr><td nowrap><code>pf-test-gen</code></td><td>Generate a unit test file for a React component using Testing Library.</td><td>stable</td></tr>
</table>

<table>
<tr><th>Agent</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-coding-standards</code></td><td>PatternFly React coding standards — import patterns, component composition, token usage, and style conventions.</td><td>—</td></tr>
<tr><td nowrap><code>pf-component-structure-audit</code></td><td>PatternFly React structural composition rules — required hierarchies, wrapper components, and props-vs-children patterns.</td><td>—</td></tr>
<tr><td nowrap><code>pf-unit-test-standards</code></td><td>PatternFly React unit testing standards — RTL patterns, mock boundaries, coverage expectations, and assertion style.</td><td>—</td></tr>
</table>


<br>

### pf-workshop

PatternFly team tools and skill incubation — issue triage, release management, codebase auditing, new skill development

<table>
<tr><th>Skill</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-analytics-repo-pruning</code></td><td>Flag archived or inactive repos in PatternFly Analytics repos.json for removal.</td><td>—</td></tr>
<tr><td nowrap><code>pf-bug-triage</code></td><td>Triage PatternFly bug reports — assess completeness, suggest fixes, identify affected components, and recommend assignees.</td><td>—</td></tr>
<tr><td nowrap><code>pf-content-review</code></td><td>Review content against PatternFly and Red Hat voice and tone standards.</td><td>—</td></tr>
<tr><td nowrap><code>pf-create-issue</code></td><td>Create well-structured GitHub issues for PatternFly repositories with templates, follow-up tracking, and duplicate detection.</td><td>—</td></tr>
<tr><td nowrap><code>pf-css-var-scan</code></td><td>Analyze --pf- CSS custom property usage and naming patterns in PatternFly SCSS.</td><td>—</td></tr>
<tr><td nowrap><code>pf-duplicate-epic</code></td><td>Clone a Jira epic from another project into the PF Jira space with back-links and feature attachment.</td><td>—</td></tr>
<tr><td nowrap><code>pf-figma-diff</code></td><td>Diff Figma designs to identify what changed and generate code update checklists.</td><td>—</td></tr>
<tr><td nowrap><code>pf-modifier-scan</code></td><td>Analyze PatternFly modifier class (pf-m-*) usage across SCSS files and generate usage reports.</td><td>—</td></tr>
<tr><td nowrap><code>pf-org-version-update</code></td><td>Update patternfly-org for a new PatternFly release — resolve versions, update package.json and versions.json, and provide build steps.</td><td>—</td></tr>
<tr><td nowrap><code>pf-prototype-mode</code></td><td>Enable prototype mode for React apps with grayscale styling and a banner overlay.</td><td>—</td></tr>
<tr><td nowrap><code>pf-quarterly-report-gen</code></td><td>Generate quarterly Jira status reports with RAG assessment, blocker tracking, and next-quarter recommendations.</td><td>—</td></tr>
<tr><td nowrap><code>pf-rhds-icon-finder</code></td><td>Find Red Hat Design System icons (@rhds/icons) by keyword or use case with visual previews.</td><td>—</td></tr>
<tr><td nowrap><code>pf-semantic-release-debug</code></td><td>Diagnose and fix semantic-release issues when a specific version is not being released.</td><td>—</td></tr>
<tr><td nowrap><code>pf-summarize-jira-issues</code></td><td>Summarize your current sprint workload from Jira — assigned issues, contributor roles, and priorities.</td><td>—</td></tr>
<tr><td nowrap><code>pf-summarize-pr-reviews</code></td><td>Summarize GitHub pull requests awaiting your review with status, age, and priority.</td><td>—</td></tr>
<tr><td nowrap><code>pf-token-build</code></td><td>Build CSS design tokens for PatternFly core and copy them to the PatternFly repo.</td><td>—</td></tr>
<tr><td nowrap><code>pf-write-example-description</code></td><td>Write and refine example descriptions for PatternFly.org component and demo pages.</td><td>—</td></tr>
</table>

<table>
<tr><th>Agent</th><th>Description</th><th>Eval</th></tr>
<tr><td nowrap><code>pf-voice-and-tone</code></td><td>PatternFly and Red Hat voice and tone standards — friendly, approachable, collaborative, inventive.</td><td>—</td></tr>
</table>

---

**Eval coverage**

- Consumer: 25/25 (100%)
- Workshop: 6/26 (23%)
