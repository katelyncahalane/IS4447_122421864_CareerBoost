// themed view – background colour follows light / dark theme

// imports
import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

// types – allow optional colour overrides per mode
export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

// component
export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // render
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
