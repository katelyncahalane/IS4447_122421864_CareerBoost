/**
 * References used for routing + navigation setup:
 * - Expo Router docs (file-based routing): https://docs.expo.dev/router/introduction/
 * - Expo Router GitHub: https://github.com/expo/router
 * - React Navigation (ThemeProvider): https://reactnavigation.org/docs/themes/
 * - Drizzle Expo SQLite migrations: https://orm.drizzle.team/docs/get-started/expo-new
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-reanimated';

import { db } from '@/db/client';
import { seedDb } from '@/db/seed';
import migrations from '@/drizzle/migrations';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success) return;
    void seedDb();
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: '#c00', textAlign: 'center' }}>
          Database migration failed: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Preparing local database…</Text>
      </View>
    );
  }

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
