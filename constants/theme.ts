// theme – shared colours + font tokens for light / dark

// imports
import { Platform } from 'react-native';

// colours – blue & white brand (light: crisp white + blue accents; dark: navy + blue)
const tintColorLight = '#2563eb';
const tintColorDark = '#93c5fd';

// tokens – text, background, tab icon colours per mode
export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    tint: tintColorLight,
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
  },
  dark: {
    text: '#f1f5f9',
    background: '#0f172a',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorDark,
    surfaceMuted: '#1e293b',
    surfaceCard: '#1e293b',
    borderSubtle: '#334155',
    barTrack: '#334155',
    textOnHero: '#f8fafc',
    heroMuted: '#bfdbfe',
  },
};

// hero gradient stops – used with expo-linear-gradient (branding / first impression)
export function heroGradientStops(scheme: 'light' | 'dark'): readonly [string, string, string] {
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
