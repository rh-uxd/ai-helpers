import { createContext, useEffect, useState, type ReactNode } from 'react';

export const ThemeContext = createContext({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.body.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((dark) => !dark) }}>
      {children}
    </ThemeContext.Provider>
  );
}
