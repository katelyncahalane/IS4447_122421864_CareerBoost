// applications tab – list job rows from sqlite (read in crud)

// imports
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { applicationsListWhere } from '@/lib/application-list-query';
import { clearSession } from '@/lib/session';
import { asc, desc, eq } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

// types – one row for the flat list (joined category name)
type ApplicationRow = {
  id: number;
  company: string;
  role: string;
  status: string;
  appliedDate: string;
  metricValue: number;
  categoryName: string;
};

type CategoryChip = { id: number; name: string };

// screen
export default function JobApplicationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const listHasLoadedRef = useRef(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [categoryChips, setCategoryChips] = useState<CategoryChip[]>([]);
  // rubric: filter list by free text and by category (both query sqlite, not only client-side)
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // data – category names for chips; applications joined with optional WHERE
  const refresh = useCallback(async () => {
    if (listHasLoadedRef.current) {
      setListRefreshing(true);
    }
    try {
      const chipRows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
      setCategoryChips(chipRows);

      const whereClause = applicationsListWhere(searchText, selectedCategoryId);
      const baseQuery = db
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
        .innerJoin(categories, eq(applications.categoryId, categories.id));

      const data = await (whereClause ? baseQuery.where(whereClause) : baseQuery).orderBy(
        desc(applications.appliedDate),
      );

      setRows(data);
    } finally {
      listHasLoadedRef.current = true;
      setShowInitialLoader(false);
      setListRefreshing(false);
    }
  }, [searchText, selectedCategoryId]);

  // effect – first load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // navigation hook – refresh when you come back from add / edit
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // handlers – go to add screen or log out (clears asyncstorage session)
  const onAddPressed = () => {
    router.push('/add-application');
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

  // render – full-screen spinner only before the first successful fetch (filters use pull-style refresh)
  if (showInitialLoader) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  // render – header + list; row tap opens edit
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
              style={({ pressed }) => [
                styles.addButton,
                { borderColor: palette.tint, opacity: pressed ? 0.7 : 1 },
              ]}>
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

        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Search (company or role)
        </ThemedText>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="e.g. Riverbank or engineer"
          placeholderTextColor={palette.icon}
          accessibilityLabel="Search applications by company or role"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: palette.text, borderColor: palette.icon }]}
        />

        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Category
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          accessibilityRole="list">
          <Pressable
            onPress={() => setSelectedCategoryId(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategoryId === null }}
            accessibilityLabel="All categories"
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: selectedCategoryId === null ? palette.tint : palette.icon,
                backgroundColor:
                  selectedCategoryId === null ? `${palette.tint}22` : palette.background,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.chipText,
                { fontWeight: selectedCategoryId === null ? '700' : '500' },
              ]}>
              All
            </ThemedText>
          </Pressable>
          {categoryChips.map((c) => {
            const selected = selectedCategoryId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCategoryId(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filter by category ${c.name}`}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: selected ? palette.tint : palette.icon,
                    backgroundColor: selected ? `${palette.tint}22` : palette.background,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText style={[styles.chipText, { fontWeight: selected ? '700' : '500' }]}>
                  {c.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {rows.length === 0 ? (
          <ThemedText style={styles.muted}>
            {searchText.trim().length > 0 || selectedCategoryId != null
              ? 'No applications match these filters. Clear search or tap All to see every row.'
              : 'No applications found. (If this is a fresh install, seed should create sample data.)'}
          </ThemedText>
        ) : null}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit application ${item.company} ${item.role}`}
            onPress={() => router.push({ pathname: '/edit-application', params: { id: String(item.id) } })}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
            <View
              style={[styles.card, { borderColor: palette.icon, backgroundColor: palette.background }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleBlock}>
                  <ThemedText type="defaultSemiBold">{item.company}</ThemedText>
                  <ThemedText style={styles.roleText}>{item.role}</ThemedText>
                </View>
                <View style={[styles.statusPill, { borderColor: palette.tint }]}>
                  <ThemedText style={[styles.statusText, { color: palette.tint }]}>{item.status}</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.meta}>
                {item.appliedDate} • metric {item.metricValue} • {item.categoryName}
              </ThemedText>
            </View>
          </Pressable>
        )}
        onRefresh={() => void refresh()}
        refreshing={listRefreshing}
      />
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  body: { padding: 16, gap: 8 },
  filterLabel: { marginTop: 4 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 14 },
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
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitleBlock: { flexShrink: 1, gap: 2 },
  roleText: { opacity: 0.9 },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontWeight: '600' },
  meta: { opacity: 0.75 },
});
