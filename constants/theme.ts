// theme – shared colours + font tokens for light / dark

// imports
import { Platform } from 'react-native';

// colours – blue & white brand (light: crisp white + blue accents; dark: navy + blue)
const tintColorLight = '#2563eb';
const tintColorDark = '#93c5fd';

// tokens – text, background, tab icon colours per mode (+ semantic states for a11y-friendly errors)
export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    tint: tintColorLight,
    /** Primary label on tint-filled buttons (WCAG contrast on #2563eb). */
    onTint: '#ffffff',
    icon: '#475569',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
    surfaceMuted: '#eff6ff',
    /** Raised cards on page background */
    surfaceCard: '#ffffff',
    borderSubtle: '#dbeafe',
    barTrack: '#e2e8f0',
    textOnHero: '#ffffff',
    heroMuted: '#dbeafe',
    errorText: '#b91c1c',
    errorSurface: '#fef2f2',
    errorBorder: '#fecaca',
    successText: '#166534',
    successSurface: '#ecfdf5',
  },
  /** Stronger text/background/border contrast for low vision (still paired with `light` scheme). */
  lightHighContrast: {
    text: '#000000',
    background: '#ffffff',
    tint: '#1d4ed8',
    onTint: '#ffffff',
    icon: '#000000',
    tabIconDefault: '#1a1a1a',
    tabIconSelected: '#1d4ed8',
    surfaceMuted: '#e8e8e8',
    surfaceCard: '#ffffff',
    borderSubtle: '#000000',
    barTrack: '#525252',
    textOnHero: '#ffffff',
    heroMuted: '#e0e7ff',
    errorText: '#7f1d1d',
    errorSurface: '#fee2e2',
    errorBorder: '#7f1d1d',
    successText: '#14532d',
    successSurface: '#dcfce7',
  },
  dark: {
    text: '#f1f5f9',
    background: '#0f172a',
    tint: tintColorDark,
    onTint: '#0f172a',
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorDark,
    surfaceMuted: '#1e293b',
    surfaceCard: '#1e293b',
    borderSubtle: '#334155',
    barTrack: '#334155',
    textOnHero: '#f8fafc',
    heroMuted: '#bfdbfe',
    errorText: '#fecaca',
    errorSurface: 'rgba(127,29,29,0.35)',
    errorBorder: '#f87171',
    successText: '#86efac',
    successSurface: 'rgba(22,101,52,0.25)',
  },
  /** Maximum separation for dark mode + high contrast. */
  darkHighContrast: {
    text: '#ffffff',
    background: '#000000',
    tint: '#93c5fd',
    onTint: '#000000',
    icon: '#ffffff',
    tabIconDefault: '#e5e5e5',
    tabIconSelected: '#93c5fd',
    surfaceMuted: '#0a0a0a',
    surfaceCard: '#000000',
    borderSubtle: '#ffffff',
    barTrack: '#a3a3a3',
    textOnHero: '#ffffff',
    heroMuted: '#dbeafe',
    errorText: '#fecaca',
    errorSurface: '#450a0a',
    errorBorder: '#fecaca',
    successText: '#bbf7d0',
    successSurface: '#052e16',
  },
};

export type AppColorScheme = 'light' | 'dark';

export type ThemePalette = (typeof Colors)['light'];

const themeMatrix = {
  light: { default: Colors.light, highContrast: Colors.lightHighContrast },
  dark: { default: Colors.dark, highContrast: Colors.darkHighContrast },
} as const;

/** Palette for the active light/dark appearance and optional high-contrast boost. */
export function resolveThemePalette(scheme: AppColorScheme, highContrast: boolean): ThemePalette {
  return themeMatrix[scheme][highContrast ? 'highContrast' : 'default'];
}

// hero gradient stops – used with expo-linear-gradient (branding / first impression)
export function heroGradientStops(
  scheme: AppColorScheme,
  highContrast = false,
): readonly [string, string, string] {
  if (highContrast) {
    if (scheme === 'dark') {
      return ['#000000', '#000000', '#1e40af'] as const;
    }
    return ['#1e3a8a', '#1d4ed8', '#1d4ed8'] as const;
  }
  if (scheme === 'dark') {
    return ['#020617', '#1e3a8a', '#2563eb'] as const;
  }
  return ['#1d4ed8', '#2563eb', '#60a5fa'] as const;
}

// fonts – platform-specific stacks (expo starter pattern)
export const Fonts = Platform.select({
  ios: {
    // ios system stacks
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
