// colour scheme (web) – avoid wrong colour before client hydration

// imports
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// hook – force light until mounted then follow system
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  // effect – flip flag after first paint on web
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
