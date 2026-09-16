# Test Library Decision Matrix

Maps accessibility test categories to testing libraries based on each library's capabilities. Use this matrix to decide which tests go to which library when a project has multiple testing tools available.

## Capability Matrix

"Unit test library" refers to whichever component/DOM testing library the project uses — React Testing Library, DOM Testing Library, @open-wc/testing, or equivalent. The capabilities below apply regardless of framework.

| A11y Test Category | Unit test library (jsdom) | jest-axe / cypress-axe | Cypress / Playwright |
|---|---|---|---|
| ARIA attributes (role, aria-label, aria-expanded, etc.) | **Primary** | — | Can test, but overkill |
| Static axe-core scan | — | **Primary** | — |
| Basic keyboard activation (Enter/Space on buttons, links) | **Primary** (userEvent or dispatchEvent) | — | Can test |
| Tab order verification | **Primary** (userEvent.tab or manual focus) | — | Can test |
| Arrow key navigation (menus, trees, tabs) | Can test | — | **Better** (real browser) |
| Focus trap (modal focus cycling) | Partial (can assert focus, but jsdom has limitations) | — | **Primary** |
| Focus shift on open (focus moves into modal/drawer/popover) | Can test | — | **Primary** |
| Focus return on close (focus returns to trigger) | Can test | — | **Primary** |
| Visual focus indicators (focus ring visibility) | **Cannot test** | — | **Primary** (screenshot/CSS) |
| Live region announcements | **Cannot test** reliably | — | Better (can assert aria-live region content) |
| Color contrast | — | Partial (axe checks contrast) | — |
| Screen reader output | **Cannot test** | — | **Cannot test** |

## Decision Rules

Apply the first matching rule based on detected test libraries:

### Rule 1 — Unit test library only (no integration test library)
Generate all tests using the detected unit test library (RTL, DOM Testing Library, @open-wc/testing, etc.). Note in the gap report that focus management tests are partial coverage — jsdom does not fully simulate browser focus behavior.

### Rule 2 — Unit test library + jest-axe
Generate ARIA and keyboard tests in the unit test library. Add axe-core scan tests in the same file using jest-axe. One test file total.

### Rule 3 — Unit test library + Cypress (or Playwright)
Generate ARIA attributes and basic keyboard activation tests in the unit test library. Generate focus management (focus traps, focus shift, focus return) and complex keyboard flows (arrow key menu navigation) in Cypress/Playwright. Two test files maximum.

### Rule 4 — Unit test library + jest-axe + Cypress (or Playwright)
Same split as Rule 3, but include axe-core scan tests in the unit test file using jest-axe. Two test files maximum.

### Rule 5 — Cypress or Playwright only (no unit test library)
Generate all tests in Cypress/Playwright. One test file. This is common for vanilla HTML/JS projects and Web Components without @open-wc/testing.

### Rule 6 — No test library found
Do not generate test files. Output a setup recommendation based on the detected framework and the test code the user would use after installing.

## Library-Specific Patterns

### RTL — ARIA attribute test
```typescript
it('has the correct role', () => {
  render(<Component />);
  expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
});

it('toggles aria-expanded on click', async () => {
  const user = userEvent.setup();
  render(<Component />);
  const toggle = screen.getByRole('button', { name: 'Details' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
});
```

### RTL — Keyboard activation test
```typescript
it('activates button with Enter', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Save</Button>);
  screen.getByRole('button', { name: 'Save' }).focus();
  await user.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('activates button with Space', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Save</Button>);
  screen.getByRole('button', { name: 'Save' }).focus();
  await user.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

### RTL — Tab order test
```typescript
it('moves focus through interactive elements in order', async () => {
  const user = userEvent.setup();
  render(<Toolbar />);
  await user.tab();
  expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
});
```

### jest-axe — Automated scan
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no axe violations in default state', async () => {
  const { container } = render(<Component />);
  expect(await axe(container)).toHaveNoViolations();
});

it('has no axe violations in error state', async () => {
  const { container } = render(<Component error="Required field" />);
  expect(await axe(container)).toHaveNoViolations();
});
```

### Cypress — Focus trap test
```typescript
it('traps focus within modal', () => {
  cy.get('[data-testid="open-modal"]').click();
  cy.focused().should('be.visible').and('be.within', '[role="dialog"]');
  // Tab through all focusable elements
  cy.realPress('Tab');
  cy.focused().should('be.within', '[role="dialog"]');
  // Tab past last element wraps to first
  cy.get('[role="dialog"]').find(':focusable').last().focus();
  cy.realPress('Tab');
  cy.get('[role="dialog"]').find(':focusable').first().should('have.focus');
});
```

### Cypress — Focus return test
```typescript
it('returns focus to trigger on modal close', () => {
  cy.get('[data-testid="open-modal"]').click();
  cy.get('[role="dialog"]').should('be.visible');
  cy.realPress('Escape');
  cy.get('[data-testid="open-modal"]').should('have.focus');
});
```

### Cypress — Arrow key menu navigation
```typescript
it('navigates menu items with arrow keys', () => {
  cy.get('[role="button"]').contains('Actions').click();
  cy.get('[role="menu"]').should('be.visible');
  cy.focused().should('have.attr', 'role', 'menuitem');
  cy.realPress('ArrowDown');
  cy.get('[role="menuitem"]').eq(1).should('have.focus');
  cy.realPress('ArrowUp');
  cy.get('[role="menuitem"]').eq(0).should('have.focus');
  cy.realPress('Escape');
  cy.get('[role="menu"]').should('not.exist');
});
```

### Playwright — Focus management test
```typescript
test('moves focus into modal on open', async ({ page }) => {
  await page.getByRole('button', { name: 'Open modal' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const focused = page.locator(':focus');
  await expect(focused).toBeAttached();
  await expect(dialog).toContainElement(focused);
});

test('returns focus to trigger on close', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Open modal' });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
```

### @axe-core/playwright — Automated scan
```typescript
import AxeBuilder from '@axe-core/playwright';

test('has no axe violations', async ({ page }) => {
  await page.goto('/component-page');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```
