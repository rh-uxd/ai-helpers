# DEPLOY-87: Simplify multi-cluster deployment configuration

**Type:** Feature Request
**Priority:** Medium
**Component:** Deployment Manager
**Labels:** ux-research, configuration

## Description

Users managing deployments across multiple clusters must manually configure each
cluster individually. The current workflow requires navigating to each cluster's
settings page, duplicating configuration values, and hoping nothing drifts.
Customers with 10+ clusters report spending hours on configuration that should
take minutes.

## User Stories

- As a **platform engineer**, I want to define a deployment configuration once
  and apply it across clusters so that I don't repeat myself for each environment.
- As a **release manager**, I want to see which clusters are out of sync with
  the canonical configuration so that I can fix drift before it causes incidents.
- As a **developer**, I want to deploy my application to a new cluster without
  learning the full configuration system so that I can focus on my code.

## Acceptance Criteria

- Users can create a shared configuration template
- Templates can be applied to one or more clusters in a single action
- Drift detection shows which clusters differ from the template
- Per-cluster overrides are supported without breaking the template link
