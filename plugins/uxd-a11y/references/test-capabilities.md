# Selecting test capabilities

Inspect the actual runner and environment, not just package names. Component tests can run in jsdom or a real browser; Web Component tests do not automatically mean one or the other. Verify package versions and existing setup before choosing APIs.

| Installed setup | Assignments |
|---|---|
| DOM/unit only | Names, states, relationships, handler outcomes, simulated keyboard; browser traversal/layout remains untested |
| DOM/unit + axe | Same plus supported DOM scans; no layout/contrast or actual speech claim from jsdom |
| DOM/unit + browser | Unit semantics/handler checks; browser keyboard entry/exit, focus lifecycle/boundaries, and layout-sensitive checks |
| DOM/unit + axe + browser | Above split; run scans in the available integration and disclose environment limits; prefer rendered-browser scans for layout-dependent rules |
| Browser only | All supported categories in that runner, including scans only if its integration exists |
| No usable setup | Conditional examples and setup advice; no knowingly unrunnable files |

Apply combinations explicitly; an available browser runner does not disappear merely because unit+axe is also installed. A bare test runner without a renderer/environment is not a complete component setup.

## Framework adaptation

- **React/Preact:** use installed rendering/test adapters, real providers, and existing JSX/transpilation conventions. Use Jest or Vitest mocking APIs only when actually available.
- **Vue/Svelte/Angular:** use the project's renderer/mount/TestBed and await its update cycle. Do not paste React imports into these projects.
- **Web Components/Lit:** import actual registrations, await definition/render completion, and inspect the appropriate shadow root. A document-wide ID match does not establish a valid cross-root relationship. Do not replace custom elements with mocked divs.
- **Native HTML:** load the actual page/fixture in the browser or use an existing DOM setup. No framework is required.
- **PF library author:** test public prop forwarding, defaults, rendered semantics, and composition. **Consumer:** test meaningful content, IDs, intended state, and lifecycle without demanding provider-owned attributes.

## Evidence boundaries

- `userEvent.tab()` simulates traversal; manual `.focus()` only sets up/asserts focus. Neither proves native browser tab order, modal behavior, or CSS visibility in jsdom.
- Dispatching key events alone does not establish browser default activation. Real browser keyboard input is needed for native traversal evidence.
- Automated DOM/tree checks can verify live-region semantics/content, not what an AT speaks or when.
- Render actual UI components, including portals. Mock external/network boundaries as needed for deterministic safe data, not the behavior being tested.
- Do not install a new runner just to satisfy every category. Report the gap and recommend the smallest justified addition.

## When no usable setup exists

Name a concrete runner suited to the supplied project and explain the choice; for a native page without a test stack, a browser runner such as Playwright avoids adding a component framework. Provide conditional setup commands and a small code example using clearly marked route/behavior placeholders. Distinguish dependencies, server configuration, and source details still needed from what is already known. An outline alone is not a setup example. Do not execute installation commands or write knowingly unrunnable project tests without the necessary authorization and context.
