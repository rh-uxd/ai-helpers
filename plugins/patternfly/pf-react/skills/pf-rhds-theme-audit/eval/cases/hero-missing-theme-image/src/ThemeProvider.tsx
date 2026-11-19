import { createContext, useEffect, useState, type ReactNode } from 'react';

export const ThemeContext = createContext({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('pf-v6-theme-dark', isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((dark) => !dark) }}>
      {children}
    </ThemeContext.Provider>
  );
}
