// categories tab – list categories (name, colour, icon); add/edit stack screens; every application record references one category.

// imports
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import { HeroBanner } from '@/components/ui/hero-banner';
import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { cardShadowStyle } from '@/lib/card-shadow';
import { asc } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

// types
type CategoryRow = { id: number; name: string; color: string; icon: string };

// screen
export default function CategoriesScreen() {
  const palette = useThemePalette();
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
      <ThemedView
        style={styles.centered}
        accessibilityLabel="Loading categories"
        accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={palette.tint} accessibilityElementsHidden />
        <ThemedText style={styles.muted}>Loading categories…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <HeroBanner
        eyebrow="CareerBoost · organise"
        title="Categories"
        tagline="Define tracks with a name, colour, and icon label. Every tracker record must reference a category."
      />
      <View style={styles.header}>
        <ThemedText style={[styles.hint, { color: palette.icon }]}>
          Create and edit categories — records always pick one
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add category with name colour and icon"
          // cast: typed routes file may lag until expo regenerates paths; route is valid at runtime
          onPress={() => router.push('/add-category' as unknown as Href)}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: palette.tint, opacity: pressed ? 0.75 : 1 },
          ]}>
          <ThemedText style={[styles.addBtnText, { color: palette.tint }]}>Add</ThemedText>
        </Pressable>
      </View>

      <FlatList
        style={styles.listFlex}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, rows.length === 0 ? styles.listEmptyGrow : null]}
        ListEmptyComponent={
          <EmptyStateCard
            icon="pricetags-outline"
            title="No categories yet"
            message="Tap Add to set a name, colour, and icon label. You will assign one category to every new record on the tracker."
            tint={palette.tint}
            surface={palette.surfaceCard}
            border={palette.borderSubtle}
            textColor={palette.text}
            mutedColor={palette.icon}
          />
        }
        refreshing={loading}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit category ${item.name}, colour ${item.color}, icon ${item.icon}`}
            accessibilityHint="Change name colour or icon. Delete only works when no records use this category."
            onPress={() =>
              router.push({
                pathname: '/edit-category',
                params: { id: String(item.id) },
              } as unknown as Href) // see note on Href cast above
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <View
              style={[
                styles.card,
                cardShadowStyle,
                { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceCard },
              ]}>
              {/* decorative swatch: row pressable already has the accessible name */}
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: item.color, borderColor: `${item.color}99` },
                ]}
                accessibilityElementsHidden
              />
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
  hint: { flex: 1, fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
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
  listFlex: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  listEmptyGrow: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: Platform.OS === 'web' ? 1 : 2,
  },
  cardText: { flex: 1, gap: 4 },
  meta: { opacity: 0.8, fontSize: 14 },
});
