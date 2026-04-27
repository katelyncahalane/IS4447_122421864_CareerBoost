// persisted light/dark choice (AsyncStorage) – optional; null key = follow device (privacy: local only)

// imports
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@careerboost/theme_scheme_v1';
const LEGACY_THEME_KEY = '@is4447/theme_scheme_v1';
const HIGH_CONTRAST_KEY = '@careerboost/high_contrast_v1';

export type StoredThemeScheme = 'light' | 'dark';

export async function getThemePreference(): Promise<StoredThemeScheme | null> {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  const legacy = await AsyncStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === 'light' || legacy === 'dark') {
    await AsyncStorage.setItem(THEME_KEY, legacy);
    await AsyncStorage.removeItem(LEGACY_THEME_KEY);
    return legacy;
  }
  return null;
}

export async function setThemePreference(scheme: StoredThemeScheme): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, scheme);
}

export async function clearThemePreference(): Promise<void> {
  await AsyncStorage.multiRemove([THEME_KEY, LEGACY_THEME_KEY]);
}

/** High contrast is independent of light/dark; stored as local "1" / "0". */
export async function getHighContrastPreference(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(HIGH_CONTRAST_KEY);
  return raw === '1';
}

export async function setHighContrastPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HIGH_CONTRAST_KEY, enabled ? '1' : '0');
}

export async function clearHighContrastPreference(): Promise<void> {
  await AsyncStorage.removeItem(HIGH_CONTRAST_KEY);
}
