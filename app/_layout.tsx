/**
 * References used for routing + navigation setup:
 * - Expo Router docs (file-based routing): https://docs.expo.dev/router/introduction/
 * - Expo Router GitHub: https://github.com/expo/router
 * - React Navigation (ThemeProvider): https://reactnavigation.org/docs/themes/
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Main app tabs (protected by the session gate in `app/index.tsx`). */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Auth screens (local-only for this coursework app). */}
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
