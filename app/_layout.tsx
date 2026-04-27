// root layout – theme + stack routes; SQLite schema via Drizzle migrator, then idempotent demo seed when empty
//
// Further reading (official sources — useful when debugging routing, theme, DB, or notifications):
// - React (docs): https://react.dev/learn and https://react.dev/reference/react
// - React (repo): https://github.com/facebook/react
// - “Learning React” (O’Reilly book, 2e overview): https://www.oreilly.com/library/view/learning-react-2nd/9781491966981/
// - Expo (docs): https://docs.expo.dev/ — Router: https://docs.expo.dev/router/introduction/
// - Expo (repo): https://github.com/expo/expo
// - React Navigation: https://reactnavigation.org/docs/getting-started — ThemeProvider / Stack: https://reactnavigation.org/docs/stack-navigator
// - expo-notifications: https://docs.expo.dev/versions/latest/sdk/notifications/ — imports use `expo-notifications/build/*` so Expo Go Android does not load the removed remote-push path (SDK 53+). Dev builds: https://docs.expo.dev/develop/development-builds/introduction/
// - React Native (docs): https://reactnative.dev/docs/getting-started
// - Video (React overview, ~100s): https://www.youtube.com/watch?v=Tn6-pxvhUWU
// - Video (Expo channel): https://www.youtube.com/@expo.dev/videos

// imports
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { Href } from 'expo-router';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
} from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import type { NotificationResponse } from 'expo-notifications/build/Notifications.types';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AppColorSchemeProvider } from '@/contexts/app-color-scheme';
import { db } from '@/db/client';
import { seedDb } from '@/db/seed';
import migrations from '@/drizzle/migrations';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { loadPrefsAndSyncReminders } from '@/lib/local-reminders';

// expo-router anchor (keeps deep links stable)
export const unstable_settings = {
  anchor: 'index',
};

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// provider – wraps navigation so every screen shares persisted light/dark preference
export default function RootLayout() {
  return (
    <AppColorSchemeProvider>
      <RootLayoutInner />
    </AppColorSchemeProvider>
  );
}

// screen – wrap whole app after db is ready
function RootLayoutInner() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const palette = useThemePalette();
  const { success, error } = useMigrations(db, migrations);

  // Offline persistence: migrations apply SQL in `drizzle/`, then seed fills core tables if the DB has no demo yet
  useEffect(() => {
    if (!success) return;
    void seedDb();
  }, [success]);

  useEffect(() => {
    if (!success || Platform.OS === 'web') return;
    void loadPrefsAndSyncReminders().catch(() => {});
  }, [success]);

  // Local reminders: open Tracker or Targets when the user taps a scheduled notification (data.route).
  useEffect(() => {
    if (!success || Platform.OS === 'web') return;

    function openFromResponse(response: NotificationResponse | null | undefined) {
      const data = response?.notification?.request?.content?.data as { route?: unknown } | undefined;
      const route = data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as Href);
      }
    }

    let mounted = true;
    void getLastNotificationResponseAsync().then((r) => {
      if (mounted) openFromResponse(r);
    });

    const sub = addNotificationResponseReceivedListener((response) => {
      openFromResponse(response);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [success, router]);

  // render – migration failed (presentable error card + a11y alert)
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: palette.background,
        }}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Database migration failed. ${error.message}`}>
        <View
          style={{
            maxWidth: 400,
            width: '100%',
            padding: 20,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.errorBorder,
            backgroundColor: palette.errorSurface,
          }}>
          <Text style={{ color: palette.errorText, fontWeight: '800', fontSize: 18, marginBottom: 8 }}>
            Could not prepare your database
          </Text>
          <Text style={{ color: palette.text, fontSize: 15, lineHeight: 22, fontWeight: '500' }}>
            {error.message}
          </Text>
          <Text style={{ color: palette.icon, fontSize: 13, marginTop: 12, lineHeight: 18, fontWeight: '500' }}>
            Try closing and reopening the app. If this persists, reinstall to reset local SQLite migrations.
          </Text>
        </View>
      </View>
    );
  }

  // render – still migrating
  if (!success) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: palette.background,
        }}
        accessibilityLabel="Preparing local SQLite database">
        <ActivityIndicator size="large" color={palette.tint} accessibilityLabel="Loading" />
        <Text style={{ marginTop: 14, color: palette.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          Preparing local SQLite database…
        </Text>
        <Text style={{ marginTop: 8, color: palette.icon, fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
          Applying schema updates. Your data stays on this device.
        </Text>
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
        {/* stack screens opened from tabs (headers optional; each file can also set Stack.Screen) */}
        <Stack.Screen name="add-category" options={{ title: 'Add category' }} />
        <Stack.Screen name="edit-category" options={{ title: 'Edit category' }} />
        <Stack.Screen name="add-application" options={{ title: 'Add record' }} />
        <Stack.Screen name="add-target" options={{ title: 'Add target' }} />
        <Stack.Screen name="edit-application" options={{ title: 'Edit record' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
