import React from 'react';
import {
  Page,
  PageSection,
  Card,
  CardBody,
  CardTitle,
} from '@patternfly/react-core';

export const PlainCardPage: React.FC = () => {
  return (
    <Page>
      <PageSection>
        <Card isPlain>
          <CardTitle>Dashboard</CardTitle>
          <CardBody>
            This card uses isPlain to blend into the glass surface.
            The Page already has glass from .pf-v6-theme-glass on html.
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};
