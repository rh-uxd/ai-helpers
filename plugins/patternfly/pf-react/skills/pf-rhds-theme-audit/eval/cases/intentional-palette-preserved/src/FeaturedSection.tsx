import { PageSection } from '@patternfly/react-core';
import '@rhds/elements/rh-card/rh-card.js';
import '@rhds/elements/rh-surface/rh-surface.js';

export function FeaturedSection() {
  return (
    <PageSection>
      {/* This card is intentionally always dark — it's a featured highlight section */}
      <rh-surface color-palette="darkest">
        <rh-card color-palette="dark">
          <h2 slot="header">Featured Product</h2>
          <p>This section is always rendered in dark theme for visual emphasis.</p>
        </rh-card>
      </rh-surface>
    </PageSection>
  );
}
