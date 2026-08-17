# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it
through GitHub's private vulnerability reporting:

1. Go to the **Security** tab of this repository
2. Click **Report a vulnerability**
3. Provide a description of the issue and steps to reproduce

We will acknowledge receipt within 3 business days and provide an initial
assessment within 10 business days.

**Do not open a public issue for security vulnerabilities.**

## Scope

This repository distributes AI coding plugins (skills and agents) as Markdown and JSON files. Security concerns include:

- Skills that instruct the AI to disable permissions or skip verification
- Bundled scripts with injection risks or unsafe command patterns
- Exposure of secrets, tokens, or credentials in skill definitions
- Reference files containing sensitive organizational data (PII, infrastructure details)

## What Is NOT a Security Issue

- Public Red Hat URLs (`ux.redhat.com`, `brand.redhat.com`, `patternfly.org`)
- Plugin manifest metadata (author names, descriptions)

**Note:** Internal URLs (`.corp.`, `pages.redhat.com`, etc.) are blocked by CI — not because they're a vulnerability, but because they indicate content that belongs in the [internal repo](https://gitlab.cee.redhat.com/uxd/internal-ai-helpers) instead of this public one.

## How Contributions Are Reviewed

See [GOVERNANCE.md](GOVERNANCE.md) for the review layers that every contribution passes through before it can affect a user's system.

## Automated Security Scanning

Every PR is scanned by multiple automated tools at two enforcement levels:

**Blocking** (fails the PR):
- **Internal URL & secret scan** — grep-based detection of internal Red Hat URLs and token prefixes

**Advisory** (findings reported, does not block merge):
- **CodeRabbit** — AI-powered review for hardcoded secrets and unsafe code patterns (PR comments)
- **Skillsaw** — content linter that catches embedded secrets in skill definitions (annotations)
- **[AI Guardian](https://github.com/RedHatProductSecurity/ai-guardian)** — security scanner for credential exfiltration, prompt injection, and code vulnerabilities (SARIF)

## Supported Versions

Only the latest version on the `main` branch is supported.
