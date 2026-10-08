import { useState, useEffect } from 'react';
import { Switch } from '@patternfly/react-core';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('pf-v6-theme-dark', isDark);
  }, [isDark]);

  return { isDark, setIsDark };
}

export function ThemeToggle() {
  const { isDark, setIsDark } = useTheme();
  return (
    <Switch
      label="Dark mode"
      isChecked={isDark}
      onChange={(_e, checked) => setIsDark(checked)}
    />
  );
}
