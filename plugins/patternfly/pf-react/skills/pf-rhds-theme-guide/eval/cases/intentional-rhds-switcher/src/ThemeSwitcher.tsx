import { useEffect } from 'react';
import '@rhds/elements/rh-scheme-toggle/rh-scheme-toggle.js';

export function ThemeSwitcher() {
  useEffect(() => {
    const handleSchemeChange = (event: Event) => {
      const { scheme } = event as Event & { scheme: 'dark' | 'light' | 'system' };
      const isDark = scheme === 'dark'
        || (scheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('pf-v6-theme-dark', isDark);
    };

    document.addEventListener('scheme-changed', handleSchemeChange);
    return () => document.removeEventListener('scheme-changed', handleSchemeChange);
  }, []);

  return <rh-scheme-toggle></rh-scheme-toggle>;
}
