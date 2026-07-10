# Example Violations

## Test Snippets

Use these to test `/pf-code-token-check`:

### SCSS
```scss
.example-button {
  /* Color violations */
  background-color: #c9190b;
  color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);

  /* Spacing violations */
  padding: 16px 24px;
  margin-bottom: 8px;
  gap: 12px;

  /* Typography violations */
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;

  /* Shadow violations */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);

  /* Border radius violations */
  border-radius: 4px;
}

.example-nav {
  .pf-c-nav__link {
    padding-inline-start: 16px;
    color: #06c;
  }
}
```

### CSS-in-JS
```tsx
const styles = {
  container: {
    backgroundColor: '#f0f0f0',
    padding: '20px',
    fontSize: '16px',
    fontWeight: 500,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  }
}
```

### React Inline Styles
```tsx
<div style={{
  color: '#151515',
  marginTop: '24px',
  borderRadius: '8px'
}}>
```

## Resolution Examples

These show the full violation → token hierarchy → recommendation flow for each category.

### Color
```css
/* Violation */
.pf-c-button--m-danger {
  background-color: #c9190b;
}

/* Token Hierarchy */
1. Raw: #c9190b
2. Palette: --pf-t--color--red--40
3. Base: --pf-t--global--color--status--danger--default
4. Semantic: --pf-v6-c-button--m-danger--BackgroundColor

/* Recommendation */
.pf-c-button--m-danger {
  background-color: var(--pf-v6-c-button--m-danger--BackgroundColor);
}
```

### Spacing
```css
/* Violation */
.pf-c-nav--m-docked .pf-c-nav__link {
  padding-inline-start: 16px;
}

/* Token Hierarchy */
1. Raw: 16px
2. Base: --pf-t--global--spacer--md (16px)
3. Semantic: --pf-v6-c-nav--m-docked__link--PaddingInlineStart (--pf-t--global--spacer--md)

/* Recommendation */
.pf-c-nav--m-docked .pf-c-nav__link {
  padding-inline-start: var(--pf-v6-c-nav--m-docked__link--PaddingInlineStart);
}

/* If semantic token doesn't exist, suggest: */
/* Create token in nav.scss: */
--pf-v6-c-nav--m-docked__link--PaddingInlineStart: var(--pf-t--global--spacer--md);
```

### Typography
```css
/* Violation */
.pf-c-title {
  font-size: 24px;
  font-weight: 600;
}

/* Token Hierarchy */
1. Raw font-size: 24px → --pf-t--global--font--size--heading--h3
2. Raw font-weight: 600 → --pf-t--global--font--weight--semibold

/* Recommendation */
.pf-c-title {
  font-size: var(--pf-t--global--font--size--heading--h3);
  font-weight: var(--pf-t--global--font--weight--semibold);
}
```

### Motion
```css
/* Violation */
.pf-c-modal {
  transition: opacity 200ms ease-in;
  animation-duration: 300ms;
}

/* Token Hierarchy */
1. Raw transition-duration: 200ms → --pf-t--global--motion--duration--default
2. Raw timing-function: ease-in → --pf-t--global--motion--timing-function--ease-in
3. Raw animation-duration: 300ms → --pf-t--global--motion--duration--long

/* Recommendation */
.pf-c-modal {
  transition: opacity var(--pf-t--global--motion--duration--default) var(--pf-t--global--motion--timing-function--ease-in);
  animation-duration: var(--pf-t--global--motion--duration--long);
}
```

### Icon Size
```css
/* Violation */
.pf-c-button__icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
}

/* Token Hierarchy */
1. Raw: 16px → --pf-t--global--icon--size--md
2. Semantic: --pf-v6-c-button__icon--FontSize

/* Recommendation */
.pf-c-button__icon {
  font-size: var(--pf-v6-c-button__icon--FontSize);
  width: var(--pf-v6-c-button__icon--FontSize);
  height: var(--pf-v6-c-button__icon--FontSize);
}
```

### Border Radius
```css
/* Violation */
.pf-c-card {
  border-radius: 8px;
}

/* Token Hierarchy */
1. Raw: 8px → --pf-t--global--border--radius--medium
2. Semantic: --pf-v6-c-card--BorderRadius

/* Recommendation */
.pf-c-card {
  border-radius: var(--pf-v6-c-card--BorderRadius);
}
```

### Shadow
```css
/* Violation */
.pf-c-card {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Token Hierarchy */
1. Raw: 0 4px 8px rgba(0, 0, 0, 0.15) → --pf-t--global--shadow--md
2. Semantic: --pf-v6-c-card--BoxShadow

/* Recommendation */
.pf-c-card {
  box-shadow: var(--pf-v6-c-card--BoxShadow);
}
```

### Outline Offset (uses --spacer)
```css
/* Violation */
.pf-c-button:focus {
  outline-offset: 4px;
}

/* Token Hierarchy */
1. Raw: 4px → --pf-t--global--spacer--xs
2. Semantic: --pf-v6-c-button--focus--OutlineOffset

/* Recommendation */
.pf-c-button:focus {
  outline-offset: var(--pf-v6-c-button--focus--OutlineOffset);
}

/* Note: outline-offset uses --spacer tokens, not border tokens */
```
