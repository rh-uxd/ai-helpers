# Accessibility Test Patterns

Canonical test patterns for each a11y test category. Adapt these patterns to the specific component under test, the detected testing library, the frontend framework, and the repo's conventions.

The patterns below show React/RTL examples as the primary notation since that is the most common PatternFly setup. For other frontend frameworks, adapt the rendering and query approach:

- **Other Testing Library variants** (Vue, Angular, Svelte, Preact, etc.): Replace `render(<Component />)` with the variant's render method. Queries (`getByRole`, `getByLabelText`, etc.) and `userEvent` work identically across all Testing Library variants.
- **@open-wc/testing (Web Components)**: Replace `render()` with `await fixture(html\`<my-element></my-element>\`)`. Use `@testing-library/dom` queries or native DOM queries.
- **Framework-specific test utilities** (Angular TestBed, Vue Test Utils, etc.): Use the framework's component mounting and query methods. Prefer role-based and accessible-name-based selectors over framework-specific helpers where possible.
- **Vanilla DOM / plain JS**: Create elements via `document.createElement()` or parse HTML strings. Use `querySelector` with role-based selectors. Use `dispatchEvent(new KeyboardEvent(...))` for keyboard interaction.
- **Cypress / Playwright**: Use the framework's built-in selectors and interaction methods (shown in separate sections below).

## Category 1 — ARIA Attributes

Generate these tests for every component. Cross-reference `../pf-a11y-audit/references/aria-attributes.md` for the full ARIA attribute table and PatternFly component prop mappings.

### What to test

- **Roles**: Verify semantic roles are present (`role="dialog"`, `role="menu"`, `role="tablist"`, etc.)
- **Accessible names**: Every interactive element has an accessible name via `aria-label`, `aria-labelledby`, or visible text content
- **State attributes**: `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed` are present with correct initial values and toggle correctly on interaction
- **Required attributes**: `aria-required` on required form fields, `aria-invalid` on fields with validation errors
- **Live regions**: Dynamic content uses `aria-live` (in PatternFly, the `isLiveRegion` prop)
- **Relationships**: `aria-describedby` and `aria-labelledby` point to existing element IDs
- **Hidden content**: Decorative elements use `aria-hidden="true"` — verify they ARE hidden, do not flag them as issues

### PF developer focus
- Verify ARIA attributes are correctly wired to component props
- Verify default accessible names are sensible
- Test that each prop variation produces the correct ARIA output

### Consumer focus
- Verify accessible names are explicitly provided (not relying on defaults that may be duplicated)
- Verify multiple instances of the same component have unique labels
- Verify live regions are used for dynamic content

### Patterns

```typescript
// Role verification
expect(screen.getByRole('dialog')).toBeInTheDocument();
expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();

// Accessible name
expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();

// State attributes — initial value
const toggle = screen.getByRole('button', { name: 'Details' });
expect(toggle).toHaveAttribute('aria-expanded', 'false');

// State attributes — toggling
await user.click(toggle);
expect(toggle).toHaveAttribute('aria-expanded', 'true');

// aria-selected on all options (not just the selected one)
const options = screen.getAllByRole('option');
expect(options[0]).toHaveAttribute('aria-selected', 'true');
expect(options[1]).toHaveAttribute('aria-selected', 'false');

// Required form fields
expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-required', 'true');

// Invalid state on validation error
expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');

// Relationship — describedby points to existing element
const input = screen.getByRole('textbox', { name: 'Password' });
const describedById = input.getAttribute('aria-describedby');
expect(document.getElementById(describedById)).toBeInTheDocument();

// Hidden decorative content
const icon = container.querySelector('[data-icon="decorative"]');
expect(icon).toHaveAttribute('aria-hidden', 'true');
```

---

## Category 2 — Keyboard Interaction

Generate these tests when interactive elements are detected. Cross-reference `../pf-a11y-keyboard/references/keyboard-criteria.md` for the full keyboard criteria.

### What to test

- **Button activation**: Enter and Space both activate buttons
- **Link activation**: Enter activates links, Space does NOT (Space scrolls the page)
- **Checkbox/Switch toggle**: Space toggles, Enter may submit parent form
- **Tab order**: Tab moves focus through interactive elements in logical order
- **Escape to close**: Escape closes menus, popovers, modals, drawers
- **Arrow key navigation**: Up/Down in menus, Left/Right in tabs, all four in calendar/grid
- **Type-ahead**: Typing characters in a menu moves focus to matching items (optional)

### Activation key expectations

| Element | Enter | Space |
|---------|-------|-------|
| Button / role="button" | Activates | Activates |
| Link / a[href] | Activates | Does NOT activate |
| Checkbox / role="checkbox" | — | Toggles |
| Switch / role="switch" | — | Toggles |
| Tab / role="tab" | Selects | Selects |
| Menu item / role="menuitem" | Activates | Activates |

### Patterns

```typescript
// Button — Enter and Space
it('activates with Enter', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Save</Button>);
  screen.getByRole('button', { name: 'Save' }).focus();
  await user.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('activates with Space', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Save</Button>);
  screen.getByRole('button', { name: 'Save' }).focus();
  await user.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(1);
});

// Tab order
it('moves focus in logical order', async () => {
  const user = userEvent.setup();
  render(<Form />);
  await user.tab();
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Submit' })).toHaveFocus();
});

// Escape to close menu
it('closes menu on Escape', async () => {
  const user = userEvent.setup();
  render(<MenuToggleWithMenu />);
  await user.click(screen.getByRole('button', { name: 'Actions' }));
  expect(screen.getByRole('menu')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

// Arrow key navigation in menu
it('navigates menu items with arrow keys', async () => {
  const user = userEvent.setup();
  render(<MenuToggleWithMenu />);
  await user.click(screen.getByRole('button', { name: 'Actions' }));
  const items = screen.getAllByRole('menuitem');
  await user.keyboard('{ArrowDown}');
  expect(items[1]).toHaveFocus();
  await user.keyboard('{ArrowUp}');
  expect(items[0]).toHaveFocus();
});
```

---

## Category 3 — Focus Management

Generate these tests when modals, drawers, popovers, or menus are detected. Cross-reference `../pf-a11y-keyboard/references/keyboard-criteria.md` (Criteria 6, 7, 8) for focus management rules.

### What to test

- **Focus shift on open**: When a modal/drawer/popover opens, focus moves to the first focusable element inside (or the container itself)
- **Focus return on close**: When dismissed, focus returns to the element that triggered the opening
- **Focus trap**: In modals, Tab past the last element wraps to the first; Shift+Tab from the first wraps to the last; focus never leaves the modal
- **Focus bridging**: When a trigger and its opened context are in different DOM locations (portals), keyboard navigation bridges the gap

### RTL limitations
RTL uses jsdom, which does not fully simulate browser focus behavior. Focus trap testing in RTL can verify that focus management functions are called and that `document.activeElement` moves, but cannot test real browser tab-wrapping behavior. Note this in the gap report when generating RTL-only focus tests.

### RTL Patterns

```typescript
// Focus shifts to modal content on open
it('moves focus into modal on open', async () => {
  const user = userEvent.setup();
  render(<ModalExample />);
  await user.click(screen.getByRole('button', { name: 'Open modal' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();
  // Focus should be within the dialog
  expect(dialog.contains(document.activeElement)).toBe(true);
});

// Focus returns to trigger on close
it('returns focus to trigger on close', async () => {
  const user = userEvent.setup();
  render(<ModalExample />);
  const trigger = screen.getByRole('button', { name: 'Open modal' });
  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
});

// Focus returns to trigger when close button is used
it('returns focus to trigger when close button is clicked', async () => {
  const user = userEvent.setup();
  render(<ModalExample />);
  const trigger = screen.getByRole('button', { name: 'Open modal' });
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(trigger).toHaveFocus();
});
```

### Cypress/Playwright Patterns (preferred for focus management)

```typescript
// Cypress — focus trap
it('traps focus within modal', () => {
  cy.get('button').contains('Open modal').click();
  // Focus is within dialog
  cy.focused().closest('[role="dialog"]').should('exist');
  // Tab through all focusable elements, verify focus stays in dialog
  for (let i = 0; i < 10; i++) {
    cy.realPress('Tab');
    cy.focused().closest('[role="dialog"]').should('exist');
  }
  // Shift+Tab also stays in dialog
  cy.realPress(['Shift', 'Tab']);
  cy.focused().closest('[role="dialog"]').should('exist');
});

// Playwright — focus trap
test('traps focus within modal', async ({ page }) => {
  await page.getByRole('button', { name: 'Open modal' }).click();
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]'));
    expect(focused).toBeTruthy();
  }
});
```

---

## Category 4 — axe-core Automated Scans

Generate these tests only when jest-axe, cypress-axe, or @axe-core/playwright is available.

### What to test

- Render the component in its default state and run an axe scan
- Render the component in each significant state variation (expanded, error, loading, disabled, selected) and scan each
- If the component has multiple visual variants (e.g., primary/secondary/danger buttons), scan each variant

### Rules

- Use `toHaveNoViolations()` matcher (jest-axe) or assert `results.violations` is empty (Playwright)
- Disable axe rules only when there is a documented false positive — add a comment explaining why
- Test at least 2 states: default and one interactive/error state

### jest-axe Patterns

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('axe accessibility checks', () => {
  it('default state has no violations', async () => {
    const { container } = render(<Component />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('expanded state has no violations', async () => {
    const { container } = render(<Component isExpanded />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('error state has no violations', async () => {
    const { container } = render(<Component validated="error" errorMessage="Required" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### cypress-axe Patterns

```typescript
import 'cypress-axe';

it('has no axe violations', () => {
  cy.visit('/component-page');
  cy.injectAxe();
  cy.checkA11y();
});

it('has no axe violations when expanded', () => {
  cy.visit('/component-page');
  cy.injectAxe();
  cy.get('button').contains('Expand').click();
  cy.checkA11y();
});
```

### @axe-core/playwright Patterns

```typescript
import AxeBuilder from '@axe-core/playwright';

test('default state has no violations', async ({ page }) => {
  await page.goto('/component-page');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```
