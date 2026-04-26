// applications tab – list job rows from sqlite (read in crud)

// imports
import { Ionicons } from '@expo/vector-icons';
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

import { useThemeControls } from '@/contexts/app-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBanner } from '@/components/ui/hero-banner';
import { StatStrip } from '@/components/ui/stat-strip';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  applicationsListWhere,
  normaliseIsoDateInput,
} from '@/lib/application-list-query';
import { cardShadowStyle } from '@/lib/card-shadow';
import { deleteLocalProfileData } from '@/lib/delete-local-profile';
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
  const { toggleColorScheme, resetToSystemTheme } = useThemeControls();
  const router = useRouter();
  const listHasLoadedRef = useRef(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [categoryChips, setCategoryChips] = useState<CategoryChip[]>([]);
  // rubric: filter list by text, category, and applied date range (sqlite WHERE, not client-only)
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');

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

      const dateFrom = normaliseIsoDateInput(dateFromInput);
      const dateTo = normaliseIsoDateInput(dateToInput);
      const whereClause = applicationsListWhere({
        searchRaw: searchText,
        categoryId: selectedCategoryId,
        dateFrom,
        dateTo,
      });
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
  }, [searchText, selectedCategoryId, dateFromInput, dateToInput]);

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

  // rubric: delete profile – wipe sqlite + session (local-only; no cloud)
  const onDeleteProfile = () => {
    Alert.alert(
      'Delete profile and all local data?',
      'Removes every application, category, target, and status log on this device. You will be signed out. You can register again afterwards. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteLocalProfileData();
                await resetToSystemTheme();
                router.replace('/login');
              } catch (err) {
                Alert.alert(
                  'Delete failed',
                  err instanceof Error ? err.message : 'Something went wrong.',
                );
              }
            })();
          },
        },
      ],
    );
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

  // render – hero + stat tiles (visual polish) then filters + list
  return (
    <ThemedView style={styles.flex}>
      <HeroBanner
        colorScheme={colorScheme}
        eyebrow="CareerBoost · IS4447"
        title="Applications"
      />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.topActions}
            accessibilityLabel="Application actions">
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
              onPress={toggleColorScheme}
              accessibilityRole="button"
              accessibilityLabel={
                colorScheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: palette.icon, opacity: pressed ? 0.75 : 1 },
              ]}>
              <Ionicons
                name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={palette.tint}
              />
            </Pressable>
            <Pressable
              onPress={onLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={styles.logoutText}>Log out</ThemedText>
            </Pressable>
            <Pressable
              onPress={onDeleteProfile}
              accessibilityRole="button"
              accessibilityLabel="Delete profile and wipe all local data"
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: '#b91c1c', opacity: pressed ? 0.75 : 1 },
              ]}>
              <Ionicons name="trash-outline" size={20} color="#b91c1c" />
            </Pressable>
          </ScrollView>
        </View>
        <Pressable
          onPress={onDeleteProfile}
          accessibilityRole="button"
          accessibilityHint="Wipes database so seed can run again on next open"
          style={({ pressed }) => [styles.resetLinkWrap, { opacity: pressed ? 0.8 : 1 }]}>
          <ThemedText style={styles.resetLink}>Reset all local data (fresh seed demo)</ThemedText>
        </Pressable>

        <View style={styles.statBlock}>
          <StatStrip
            palette={palette}
            items={[
              {
                label: 'In this list',
                value: rows.length,
                icon: 'layers-outline',
                accessibilityLabel: `Applications currently listed, ${rows.length}`,
              },
              {
                label: 'Categories',
                value: categoryChips.length,
                icon: 'pricetags-outline',
                accessibilityLabel: `Saved categories, ${categoryChips.length}`,
              },
            ]}
          />
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
          Applied date range (optional)
        </ThemedText>
        <View style={styles.dateRow}>
          <TextInput
            value={dateFromInput}
            onChangeText={setDateFromInput}
            placeholder="From YYYY-MM-DD"
            placeholderTextColor={palette.icon}
            accessibilityLabel="Filter applications applied on or after this date"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.dateInput, { color: palette.text, borderColor: palette.icon }]}
          />
          <TextInput
            value={dateToInput}
            onChangeText={setDateToInput}
            placeholder="To YYYY-MM-DD"
            placeholderTextColor={palette.icon}
            accessibilityLabel="Filter applications applied on or before this date"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.dateInput, { color: palette.text, borderColor: palette.icon }]}
          />
        </View>
        {dateFromInput.trim() && !normaliseIsoDateInput(dateFromInput) ? (
          <ThemedText style={styles.warnText}>From date: use YYYY-MM-DD.</ThemedText>
        ) : null}
        {dateToInput.trim() && !normaliseIsoDateInput(dateToInput) ? (
          <ThemedText style={styles.warnText}>To date: use YYYY-MM-DD.</ThemedText>
        ) : null}
        {(dateFromInput.trim() && normaliseIsoDateInput(dateFromInput)) ||
        (dateToInput.trim() && normaliseIsoDateInput(dateToInput)) ? (
          <Pressable
            onPress={() => {
              setDateFromInput('');
              setDateToInput('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear date range filters"
            style={({ pressed }) => [styles.clearDates, { opacity: pressed ? 0.75 : 1 }]}>
            <ThemedText style={[styles.clearDatesText, { color: palette.tint }]}>
              Clear date range
            </ThemedText>
          </Pressable>
        ) : null}

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
            {searchText.trim().length > 0 ||
            selectedCategoryId != null ||
            (dateFromInput.trim() && normaliseIsoDateInput(dateFromInput)) ||
            (dateToInput.trim() && normaliseIsoDateInput(dateToInput))
              ? 'No applications match these filters. Adjust search, category, dates, or clear filters.'
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
              style={[
                styles.card,
                cardShadowStyle,
                {
                  borderColor: palette.borderSubtle,
                  backgroundColor: palette.background,
                },
              ]}>
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
  body: { padding: 16, paddingTop: 10, gap: 8 },
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
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
  },
  warnText: { color: '#b45309', fontSize: 13 },
  clearDates: { alignSelf: 'flex-start', paddingVertical: 4 },
  clearDatesText: { fontWeight: '600', fontSize: 14 },
  statBlock: { marginBottom: 6 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 4,
  },
  resetLinkWrap: { alignSelf: 'flex-end', marginBottom: 10, paddingVertical: 4 },
  resetLink: { color: '#b91c1c', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
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
