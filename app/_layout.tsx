// root layout – theme + stack routes + run drizzle migrations then seed

// imports
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

// expo-router anchor (keeps deep links stable)
export const unstable_settings = {
  anchor: 'index',
};

// screen – wrap whole app after db is ready
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  // side effect – fill demo rows once migrations succeed
  useEffect(() => {
    if (!success) return;
    void seedDb();
  }, [success]);

  // render – migration failed (show message, stop app shell)
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: '#c00', textAlign: 'center' }}>
          Database migration failed: {error.message}
        </Text>
      </View>
    );
  }

  // render – still migrating
  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Preparing local database…</Text>
      </View>
    );
  }

  // render – normal app: tabs + auth screens
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
