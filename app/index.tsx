/**
 * Startup gate for the app:
 * - Seeds local SQLite DB once (for demo data).
 * - Routes to `/login` if no session, otherwise routes to `/(tabs)`.
 *
 * References:
 * - Expo Router docs (navigation + routing): https://docs.expo.dev/router/introduction/
 * - expo-sqlite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
 * - Drizzle ORM (SQLite): https://orm.drizzle.team/
 */
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { seedDb } from '@/db/seed';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSession } from '@/lib/session';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  useEffect(() => {
    let mounted = true;
    void (async () => {
      // Ensure demo data exists before any list screens load.
      await seedDb();
      const session = await getSession();
      if (!mounted) return;
      router.replace(session ? '/(tabs)' : '/login');
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator size="large" color={palette.tint} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

