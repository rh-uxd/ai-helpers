import React from 'react';
import { Card, CardBody, CardTitle } from '@patternfly/react-core';

export const StandaloneGlassCard: React.FC = () => {
  return (
    <div className="my-solid-background-container">
      <Card isGlass>
        <CardTitle>Standalone Glass Card</CardTitle>
        <CardBody>
          This card uses isGlass on a solid background page that does not
          have .pf-v6-theme-glass enabled. This is valid — the card provides
          its own independent glass treatment.
        </CardBody>
      </Card>
    </div>
  );
};
