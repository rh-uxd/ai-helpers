import '@rhds/elements/rh-navigation-primary/rh-navigation-primary.js';
import '@rhds/elements/rh-scheme-toggle/rh-scheme-toggle.js';

export function Header() {
  return (
    <rh-navigation-primary>
      <a href="/" slot="logo">Portal</a>
      <rh-scheme-toggle slot="utility"></rh-scheme-toggle>
    </rh-navigation-primary>
  );
}
