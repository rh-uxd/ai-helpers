import { PageSection } from '@patternfly/react-core';
import '@rhds/elements/rh-card/rh-card.js';
import '@rhds/elements/rh-tabs/rh-tabs.js';
import { useTheme } from './ThemeToggle';

export function Dashboard() {
  const { isDark } = useTheme();

  return (
    <PageSection>
      <rh-card color-palette={isDark ? 'darkest' : 'lightest'}>
        <h2 slot="header">Overview</h2>
        <p>Dashboard content here.</p>
      </rh-card>

      <rh-tabs color-palette={isDark ? 'darkest' : 'lightest'}>
        <rh-tab slot="tab">Tab 1</rh-tab>
        <rh-tab-panel>Panel 1 content</rh-tab-panel>
        <rh-tab slot="tab">Tab 2</rh-tab>
        <rh-tab-panel>Panel 2 content</rh-tab-panel>
      </rh-tabs>
    </PageSection>
  );
}
