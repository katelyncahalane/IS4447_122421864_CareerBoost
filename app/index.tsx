// entry route – send user to login or main tabs based on saved session

// imports
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSession } from '@/lib/session';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// screen – tiny gate; no heavy work here (db runs in root layout)
export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  // effect – read asyncstorage once then replace route
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const session = await getSession();
      if (!mounted) return;
      router.replace(session ? '/(tabs)' : '/login');
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // render – spinner while we decide where to go
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator size="large" color={palette.tint} />
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
