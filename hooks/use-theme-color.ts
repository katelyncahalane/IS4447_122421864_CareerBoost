// theme colour – pick light/dark token or optional prop override

// imports
import { resolveThemePalette, type ThemePalette } from '@/constants/theme';
import { useThemeControls } from '@/contexts/app-color-scheme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// hook – returns one resolved colour string
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemePalette
) {
  const theme = useColorScheme() ?? 'light';
  const { highContrast } = useThemeControls();
  const colorFromProps = props[theme];
  const palette = resolveThemePalette(theme, highContrast);

  if (colorFromProps) {
    return colorFromProps;
  }
  return palette[colorName];
}
