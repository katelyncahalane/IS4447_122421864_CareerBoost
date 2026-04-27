// resolved UI palette — light/dark plus optional high-contrast (persisted separately)
//
// References — theming in React Native:
// - React Native Appearance: https://reactnative.dev/docs/appearance
// - MDN color & contrast (design intuition): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
// - WCAG contrast (overview): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
// - Expo useColorScheme note: https://docs.expo.dev/develop/user-interface/color-themes/
// - Book (Learning React, O’Reilly): https://www.oreilly.com/library/view/learning-react-2nd/9781491966981/

import { resolveThemePalette } from '@/constants/theme';
import { useThemeControls } from '@/contexts/app-color-scheme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemePalette() {
  const scheme = useColorScheme() ?? 'light';
  const { highContrast } = useThemeControls();
  return resolveThemePalette(scheme, highContrast);
}
