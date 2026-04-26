// persisted light/dark choice (AsyncStorage) – optional; null key = follow device (privacy: local only)

// imports
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@is4447/theme_scheme_v1';

export type StoredThemeScheme = 'light' | 'dark';

export async function getThemePreference(): Promise<StoredThemeScheme | null> {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

export async function setThemePreference(scheme: StoredThemeScheme): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, scheme);
}

export async function clearThemePreference(): Promise<void> {
  await AsyncStorage.removeItem(THEME_KEY);
}
