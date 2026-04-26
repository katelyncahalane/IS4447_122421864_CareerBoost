// app-wide colour scheme: optional persisted override vs device (advanced rubric: theme toggle)

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

import { clearThemePreference, getThemePreference, setThemePreference } from '@/lib/theme-preference';

type Scheme = 'light' | 'dark';

type Ctx = {
  colorScheme: Scheme;
  toggleColorScheme: () => void;
  /** After delete profile: follow device again */
  resetToSystemTheme: () => Promise<void>;
};

const AppColorSchemeContext = createContext<Ctx | null>(null);

export function AppColorSchemeProvider({ children }: { children: ReactNode }) {
  const device = (useDeviceColorScheme() ?? 'light') as Scheme;
  const [stored, setStored] = useState<Scheme | null | undefined>(undefined);

  useEffect(() => {
    void getThemePreference().then((v) => setStored(v));
  }, []);

  const colorScheme = useMemo((): Scheme => {
    if (stored === 'light' || stored === 'dark') return stored;
    return device;
  }, [stored, device]);

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

  const value = useMemo(
    () => ({ colorScheme, toggleColorScheme, resetToSystemTheme }),
    [colorScheme, toggleColorScheme, resetToSystemTheme],
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
  return { toggleColorScheme: ctx.toggleColorScheme, resetToSystemTheme: ctx.resetToSystemTheme };
}
