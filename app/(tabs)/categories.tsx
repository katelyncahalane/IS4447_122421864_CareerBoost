// categories tab – coursework requirement: list categories (name, colour, icon); tap to edit, add for create.

// imports
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { asc } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

// types
type CategoryRow = { id: number; name: string; color: string; icon: string };

// screen
export default function CategoriesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CategoryRow[]>([]);

  // data
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db
        .select({
          id: categories.id,
          name: categories.name,
          color: categories.color,
          icon: categories.icon,
        })
        .from(categories)
        .orderBy(asc(categories.name));
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // first mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // when returning from add/edit stack screens, refresh so the list stays current
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // render
  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading categories…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <View style={styles.header}>
        <ThemedText type="title">Categories</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new category"
          // cast: typed routes file may lag until expo regenerates paths; route is valid at runtime
          onPress={() => router.push('/add-category' as unknown as Href)}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: palette.tint, opacity: pressed ? 0.75 : 1 },
          ]}>
          <ThemedText style={[styles.addBtnText, { color: palette.tint }]}>Add</ThemedText>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <ThemedText style={styles.empty}>No categories yet. Tap Add to create one.</ThemedText>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit category ${item.name}`}
            accessibilityHint="Opens the edit screen for this category"
            onPress={() =>
              router.push({
                pathname: '/edit-category',
                params: { id: String(item.id) },
              } as unknown as Href) // see note on Href cast above
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.card, { borderColor: palette.icon }]}>
              {/* decorative swatch: row pressable already has the accessible name */}
              <View style={[styles.swatch, { backgroundColor: item.color }]} accessibilityElementsHidden />
              <View style={styles.cardText}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.meta}>Icon: {item.icon}</ThemedText>
              </View>
            </View>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBtnText: { fontWeight: '700', fontSize: 16 },
  empty: { paddingHorizontal: 16, opacity: 0.85, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#00000022' },
  cardText: { flex: 1, gap: 4 },
  meta: { opacity: 0.8, fontSize: 14 },
});
