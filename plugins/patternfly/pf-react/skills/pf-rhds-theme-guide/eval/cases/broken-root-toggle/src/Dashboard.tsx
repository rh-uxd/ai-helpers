import { PageSection } from '@patternfly/react-core';
import '@rhds/elements/rh-card/rh-card.js';

export function Dashboard() {
  return (
    <PageSection>
      <rh-card>
        <h2 slot="header">Account summary</h2>
      </rh-card>
    </PageSection>
  );
}
