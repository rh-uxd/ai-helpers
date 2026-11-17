# Accessibility test recipes

These are adaptation patterns, not drop-in tests for unknown projects. Resolve actual imports, fixtures, names, routes, package versions, and setup before writing files. Use assertions supported by the installed runner.

## Shared assertions

- Query exposed role/name where supported. Assert native required/checked/selected semantics or role-appropriate ARIA; do not demand `aria-required` on native required inputs, `aria-hidden` on empty-alt decoration, or distinct strings for identical-purpose controls.
- For ID-reference lists, split whitespace and check every target in the relevant root; then check the intended relationship/name. Existence alone does not establish ownership or correct text.
- Exercise state transitions, repeated instances, and meaningful error/expanded states. Test component-managed state through real rendering rather than forcing the expected attributes in test setup.
- Use explicit awaited readiness conditions. Keep direct-focus setup distinct from a keyboard journey; test forward and reverse modal boundaries rather than an arbitrary number of tabs.

## DOM Testing Library with Jest/Vitest

Use the project's render function and matcher setup (for example jest-dom where installed). A native required field can be tested with `toBeRequired()` where supported. For keyboard activation:

```js
const user = userEvent.setup();
// Render the real component with its normal providers before querying.
const save = screen.getByRole('button', { name: 'Save' });
save.focus(); // Isolated activation setup, not a tab-order test.
await user.keyboard('{Enter}');
// Assert the observable action occurred once using the project's spy/state assertion.
```

Test Space in an independent/reset scenario. Do not claim simulated focus establishes actual browser containment. For `jest-axe`, register its matcher using the installed integration; scan the rendered root including portals (often `baseElement` or document body), not only a container that excludes them. Keep meaningful default/error/open states and scanner limitations from [scanning](runtime-scanning.md).

## Playwright

Use `@playwright/test` imports and actual configured routes. Keyboard-open before asserting focus and dismissal:

```js
await page.goto('/actual-route'); // Replace with the project's real target.
const trigger = page.getByRole('button', { name: 'Review changes' });
await trigger.focus(); // Isolated lifecycle setup; test natural entry separately.
await page.keyboard.press('Enter');
const dialog = page.getByRole('dialog', { name: 'Review changes', exact: true });
await expect(dialog).toBeVisible();
await expect(dialog.locator(':focus')).toHaveCount(1); // Light-DOM focus only.
await page.keyboard.press('Escape');
await expect(dialog).not.toBeVisible();
await expect(trigger).toBeFocused();
```

For shadow DOM, inspect the deepest active element when necessary. Accept static initial focus and meaningful successor restoration from the shared modal reference. Add both actual sequence boundaries and background exclusion; the short lifecycle example does not prove either. Do not invent `toContainElement` for Playwright locators or a universal `:focusable` selector.

Initial focus may be in the middle of the dialog's sequential order. Establish the actual next/previous targets from that position; do not assume Tab from an introduction reaches the first control. Test complete traversal separately from boundary probes. For isolated probes, explicitly label direct focus on the verified last control before Tab and on the verified first control before Shift+Tab. Those probes establish boundary behavior, not reachability of every control.

When `@axe-core/playwright` is installed, use its supported builder API, record configured tags/scope, and retain violations and incomplete results. A zero-violations assertion alone does not clear incomplete findings.

For resize coverage, follow the [persistent browser zoom procedure](visual-runtime.md#persistent-200-browser-zoom-procedure). Use an isolated persistent context and the browser's actual zoom setting; verify persistence after restart/reload and throughout interactions. Do not substitute `deviceScaleFactor`, CSS font injection, or a transient font override for verified browser zoom. Validate screenshot framing before treating a crop as a page defect.

## Cypress

Use the installed version's native keyboard API where available, or an already configured real-keyboard integration. Verify commands before writing `cy.press` or `cy.realPress`; neither may be assumed in every project. Do not replace native Tab with `trigger('keydown')` and call it a browser traversal test.

With supported `cy.press`, the pattern is:

```js
cy.get('#actual-trigger').focus(); // Explicit isolated setup.
cy.press(Cypress.Keyboard.Keys.ENTER);
cy.get('[role="dialog"]').should('be.visible');
cy.focused().should($el => {
  expect($el.closest('[role="dialog"]').length).to.equal(1);
});
cy.press(Cypress.Keyboard.Keys.ESC);
cy.get('#actual-trigger').should('have.focus');
```

Replace selectors and expected initial focus using real source. Use standard assertions or DOM containment rather than invented `be.within` matchers. If `cypress-axe` is configured, inject after loading the target and scan relevant states with `checkA11y` using its installed API. Preserve detailed results and incomplete-review work; do not silently disable problematic rules.

## Sources

- [Testing Library keyboard simulation](https://testing-library.com/docs/user-event/keyboard/)
- [Playwright assertions](https://playwright.dev/docs/test-assertions)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Cypress keyboard press](https://docs.cypress.io/api/commands/press)
- [jest-axe](https://github.com/NickColley/jest-axe)
- [cypress-axe](https://github.com/component-driven/cypress-axe)
