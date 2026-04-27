// app-wide colour scheme: optional persisted override vs device (advanced rubric: theme toggle)
//
// React patterns used here — Context + hooks (good background for debugging provider scope):
// - useContext / createContext: https://react.dev/reference/react/createContext
// - Passing data deeply: https://react.dev/learn/passing-data-deeply-with-context
// - React repo (issues & examples): https://github.com/facebook/react
// - React Native useColorScheme: https://reactnative.dev/docs/usecolorscheme
// - Book (Learning React, O’Reilly — state & context): https://www.oreilly.com/library/view/learning-react-2nd/9781491966981/
// - Video (hooks refresher): https://www.youtube.com/watch?v=TNhaISOUy6I

// imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

import {
  clearHighContrastPreference,
  clearThemePreference,
  getHighContrastPreference,
  getThemePreference,
  setHighContrastPreference,
  setThemePreference,
} from '@/lib/theme-preference';

type Scheme = 'light' | 'dark';

type Ctx = {
  colorScheme: Scheme;
  /** True once hydrated and user follows device light/dark (no forced override). */
  followsSystem: boolean;
  /** Persisted separately from light/dark; boosts text and border separation. */
  highContrast: boolean;
  toggleColorScheme: () => void;
  toggleHighContrast: () => void;
  /** After delete profile: follow device again */
  resetToSystemTheme: () => Promise<void>;
  /** Clears saved high-contrast preference (e.g. after wiping local profile). */
  resetHighContrastPreference: () => Promise<void>;
};

const AppColorSchemeContext = createContext<Ctx | null>(null);

export function AppColorSchemeProvider({ children }: { children: ReactNode }) {
  const device = (useDeviceColorScheme() ?? 'light') as Scheme;
  const [stored, setStored] = useState<Scheme | null | undefined>(undefined);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    void Promise.all([getThemePreference(), getHighContrastPreference()]).then(([schemePref, hc]) => {
      setStored(schemePref);
      setHighContrast(hc);
    });
  }, []);

  const colorScheme = useMemo((): Scheme => {
    if (stored === 'light' || stored === 'dark') return stored;
    return device;
  }, [stored, device]);

  const followsSystem = useMemo(() => {
    if (stored === undefined) return true;
    return stored === null;
  }, [stored]);

  const toggleColorScheme = useCallback(() => {
    const current = stored === undefined ? device : (stored ?? device);
    const next: Scheme = current === 'light' ? 'dark' : 'light';
    setStored(next);
    void setThemePreference(next);
  }, [stored, device]);

  const resetToSystemTheme = useCallback(async () => {
    await clearThemePreference();
    setStored(null);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      void setHighContrastPreference(next);
      return next;
    });
  }, []);

  const resetHighContrastPreference = useCallback(async () => {
    await clearHighContrastPreference();
    setHighContrast(false);
  }, []);

  const value = useMemo(
    () => ({
      colorScheme,
      followsSystem,
      highContrast,
      toggleColorScheme,
      toggleHighContrast,
      resetToSystemTheme,
      resetHighContrastPreference,
    }),
    [
      colorScheme,
      followsSystem,
      highContrast,
      toggleColorScheme,
      toggleHighContrast,
      resetToSystemTheme,
      resetHighContrastPreference,
    ],
  );

  return <AppColorSchemeContext.Provider value={value}>{children}</AppColorSchemeContext.Provider>;
}

export function useColorScheme(): Scheme {
  const ctx = useContext(AppColorSchemeContext);
  if (!ctx) {
    throw new Error('useColorScheme must be used within AppColorSchemeProvider');
  }
  return ctx.colorScheme;
}

export function useThemeControls() {
  const ctx = useContext(AppColorSchemeContext);
  if (!ctx) {
    throw new Error('useThemeControls must be used within AppColorSchemeProvider');
  }
  return {
    followsSystem: ctx.followsSystem,
    highContrast: ctx.highContrast,
    toggleColorScheme: ctx.toggleColorScheme,
    toggleHighContrast: ctx.toggleHighContrast,
    resetToSystemTheme: ctx.resetToSystemTheme,
    resetHighContrastPreference: ctx.resetHighContrastPreference,
  };
}
