import { Hero } from '@patternfly/react-core';
import '@rhds/elements/rh-card/rh-card.js';

export function HomePage() {
  return (
    <>
      <Hero backgroundSrcLight="/images/hero-light.png">
        <h1>Product portal</h1>
      </Hero>
      <rh-card>
        <h2 slot="header">Get started</h2>
      </rh-card>
    </>
  );
}
