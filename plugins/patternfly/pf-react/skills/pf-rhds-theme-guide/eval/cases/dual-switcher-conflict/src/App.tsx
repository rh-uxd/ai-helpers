import { useState } from 'react';
import { Page, PageSection, Switch } from '@patternfly/react-core';
import { Header } from './Header';

export default function App() {
  const [isDark, setIsDark] = useState(false);

  const handleToggle = (_e: unknown, checked: boolean) => {
    setIsDark(checked);
    document.documentElement.classList.toggle('pf-v6-theme-dark', checked);
  };

  return (
    <Page>
      <Header />
      <PageSection>
        <Switch
          label="Dark mode"
          isChecked={isDark}
          onChange={handleToggle}
        />
        <p>Main content area.</p>
      </PageSection>
    </Page>
  );
}
