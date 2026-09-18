import React from 'react';
import {
  Page,
  PageSection,
  Card,
  CardBody,
  CardTitle,
} from '@patternfly/react-core';

export const GlassPage: React.FC = () => {
  return (
    <Page>
      <PageSection>
        <Card isGlass>
          <CardTitle>Dashboard</CardTitle>
          <CardBody>
            This card has isGlass but it's inside a Page that already has
            glass from .pf-v6-theme-glass on the html tag.
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};
