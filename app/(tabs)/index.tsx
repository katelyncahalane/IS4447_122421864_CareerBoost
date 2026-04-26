import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { clearSession } from '@/lib/session';
import { eq, desc } from 'drizzle-orm';
import { useRouter } from 'expo-router';

type ApplicationRow = {
  id: number;
  company: string;
  role: string;
  status: string;
  appliedDate: string;
  metricValue: number;
  categoryName: string;
};

export default function JobApplicationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ApplicationRow[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db
        .select({
          id: applications.id,
          company: applications.company,
          role: applications.role,
          status: applications.status,
          appliedDate: applications.appliedDate,
          metricValue: applications.metricValue,
          categoryName: categories.name,
        })
        .from(applications)
        .innerJoin(categories, eq(applications.categoryId, categories.id))
        .orderBy(desc(applications.appliedDate));

      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onAddPressed = () => {
    Alert.alert('Next step', 'Next small step is Add/Edit/Delete screens using SQLite.');
  };

  const onLogout = () => {
    Alert.alert('Log out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, log out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <ThemedText type="title">Applications</ThemedText>
          <View style={styles.topActions}>
            <Pressable
              onPress={onAddPressed}
              accessibilityRole="button"
              accessibilityLabel="Add application"
              style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={[styles.addText, { color: palette.tint }]}>Add</ThemedText>
            </Pressable>
            <Pressable
              onPress={onLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={styles.logoutText}>Log out</ThemedText>
            </Pressable>
          </View>
        </View>

        {rows.length === 0 ? (
          <ThemedText style={styles.muted}>
            No applications found. (If this is a fresh install, seed should create sample data.)
          </ThemedText>
        ) : null}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: palette.icon }]}>
            <ThemedText type="defaultSemiBold">{item.company}</ThemedText>
            <ThemedText>{item.role}</ThemedText>
            <ThemedText style={styles.meta}>
              {item.appliedDate} • metric {item.metricValue} • {item.categoryName} • {item.status}
            </ThemedText>
          </View>
        )}
        onRefresh={() => void refresh()}
        refreshing={loading}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  body: { padding: 16, gap: 8 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  topActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  addText: { fontWeight: '600' },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c00',
  },
  logoutText: { color: '#c00', fontWeight: '600' },
  muted: { opacity: 0.8, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 2 },
  meta: { opacity: 0.8, marginTop: 4 },
});
