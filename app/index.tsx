import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
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
    void getSession().then((session) => {
      if (!mounted) return;
      router.replace(session ? '/(tabs)' : '/login');
    });
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

