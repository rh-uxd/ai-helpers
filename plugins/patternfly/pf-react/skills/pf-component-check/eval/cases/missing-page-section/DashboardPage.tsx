import React from 'react';
import { Page, Title } from '@patternfly/react-core';

interface DashboardPageProps {
  title: string;
}

/** Invalid: Page main content must use PageSection (or PageGroup), not a raw div. */
export const DashboardPage: React.FC<DashboardPageProps> = ({ title }) => (
  <Page>
    <div className="dashboard-content">
      <Title headingLevel="h1">{title}</Title>
      <p>Welcome to the dashboard.</p>
    </div>
  </Page>
);
