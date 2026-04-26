// theme – shared colours + font tokens for light / dark

// imports
import { Platform } from 'react-native';

// colours – blue accent for coursework branding
const tintColorLight = '#2563eb';
const tintColorDark = '#fff';

// tokens – text, background, tab icon colours per mode
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    surfaceMuted: '#f1f5f9',
    borderSubtle: '#e2e8f0',
    barTrack: '#e2e8f0',
    textOnHero: '#f8fafc',
    heroMuted: '#bfdbfe',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    surfaceMuted: '#1e293b',
    borderSubtle: '#334155',
    barTrack: '#334155',
    textOnHero: '#f8fafc',
    heroMuted: '#93c5fd',
  },
};

// hero gradient stops – used with expo-linear-gradient (branding / first impression)
export function heroGradientStops(scheme: 'light' | 'dark'): readonly [string, string, string] {
  if (scheme === 'dark') {
    return ['#0b1220', '#1e3a8a', '#2563eb'] as const;
  }
  return ['#1e40af', '#2563eb', '#38bdf8'] as const;
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
