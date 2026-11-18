# Design Spec: API Key Management

## Screens

### SCR-1 — API key list
Route: `/api-keys`
STRAT AC: #1, #2

```html
<h1>API keys</h1>
<button>Create API key</button>
<table>
  <caption>API keys</caption>
</table>
```

#### State: empty (`empty`)

```html
<h1>API keys</h1>
<h2>No API keys yet</h2>
<button>Create API key</button>
```

## Journeys

### J-1 — Create API key
Persona: app-developer
STRAT AC: #1, #2

1. **API key list** — Screen SCR-1 (`/api-keys`)
2. **Create modal open** — Screen SCR-1 (`/api-keys`); click "Create API key"; dialog is visible

**Outcome:** A new API key appears in the list.

## Out of scope

- Bulk key rotation

## Test environment

### Roles

| ID | Role | Permissions | Resource scope | Journeys |
|----|------|-------------|----------------|----------|
| TU-1 | app-developer | Create and list API keys | API keys in the project | J-1 |

### Sample data

| ID | Screen | Purpose | Starting state |
|----|--------|---------|----------------|
| DATA-1 | SCR-1 | Populated list | Several API keys already exist |
| DATA-2 | SCR-1 | Empty state | No API keys yet |
