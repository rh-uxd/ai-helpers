import { useEffect, useState } from 'react';

declare global {
  interface Window {
    UxdScenario?: {
      get: () => string;
      set: (id: string) => void;
      subscribe: (cb: (id: string) => void) => () => void;
      DEFAULT_ID?: string;
    };
  }
}

/**
 * Active prototype scenario id from ?scenario= (via window.UxdScenario).
 * Falls back to "default" when the runtime is not loaded.
 */
export function useUxdScenario(): string {
  const [scenario, setScenario] = useState(() =>
    typeof window !== 'undefined' && window.UxdScenario
      ? window.UxdScenario.get()
      : 'default'
  );

  useEffect(() => {
    if (!window.UxdScenario) {
      setScenario('default');
      return;
    }
    setScenario(window.UxdScenario.get());
    return window.UxdScenario.subscribe((id) => setScenario(id));
  }, []);

  return scenario;
}

export default useUxdScenario;
