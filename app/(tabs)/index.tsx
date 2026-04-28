// applications tab – list job rows from SQLite; rich filters (text, dates, category, status, metric, notes) in WHERE
//
// References — lists, SQL-shaped filters, export, a11y:
// - Drizzle where / and / or: https://orm.drizzle.team/docs/select#filtering
// - React Native FlatList: https://reactnative.dev/docs/flatlist
// - Accessibility (labels, roles): https://reactnative.dev/docs/accessibility
// - expo-sharing (CSV export): https://docs.expo.dev/versions/latest/sdk/sharing/
// - React repo (issues): https://github.com/facebook/react
// - Video (lists & performance): https://www.youtube.com/watch?v=sjBdhKObZWQ

// imports
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { useThemeControls } from '@/contexts/app-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import { HeroBanner } from '@/components/ui/hero-banner';
import { StatStrip } from '@/components/ui/stat-strip';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePalette } from '@/hooks/use-theme-palette';
import {
  applicationsListWhere,
  normaliseIsoDateInput,
  parseMetricBound,
} from '@/lib/application-list-query';
import { APPLICATION_STATUSES } from '@/lib/application-statuses';
import { cardShadowStyle } from '@/lib/card-shadow';
import { deleteLocalProfileData } from '@/lib/delete-local-profile';
import { exportAndShareApplicationsCsv } from '@/lib/export-applications-csv';
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
  categoryColor: string;
};

type CategoryChip = { id: number; name: string };

type ListSortMode = 'date_desc' | 'date_asc' | 'company_az' | 'metric_desc';

function toIsoYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function presetLastNDays(n: number): { from: string; to: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (n - 1));
  return { from: toIsoYmd(start), to: toIsoYmd(end) };
}

function presetThisMonthRange(): { from: string; to: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { from: toIsoYmd(start), to: toIsoYmd(end) };
}

function presetThisYearRange(): { from: string; to: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), 0, 1);
  return { from: toIsoYmd(start), to: toIsoYmd(end) };
}

// screen
export default function JobApplicationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = useThemePalette();
  const {
    toggleColorScheme,
    resetToSystemTheme,
    followsSystem,
    highContrast,
    toggleHighContrast,
    resetHighContrastPreference,
  } = useThemeControls();
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
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [metricMinInput, setMetricMinInput] = useState('');
  const [metricMaxInput, setMetricMaxInput] = useState('');
  const [hasNotesOnly, setHasNotesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<ListSortMode>('date_desc');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportBanner, setExportBanner] = useState<string | null>(null);
  const exportBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveFilters = useMemo(() => {
    const fromOk = Boolean(dateFromInput.trim() && normaliseIsoDateInput(dateFromInput));
    const toOk = Boolean(dateToInput.trim() && normaliseIsoDateInput(dateToInput));
    return (
      searchText.trim().length > 0 ||
      selectedCategoryId != null ||
      fromOk ||
      toOk ||
      statusFilters.length > 0 ||
      parseMetricBound(metricMinInput) != null ||
      parseMetricBound(metricMaxInput) != null ||
      hasNotesOnly
    );
  }, [
    searchText,
    selectedCategoryId,
    dateFromInput,
    dateToInput,
    statusFilters,
    metricMinInput,
    metricMaxInput,
    hasNotesOnly,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchText.trim()) n += 1;
    if (selectedCategoryId != null) n += 1;
    if (normaliseIsoDateInput(dateFromInput)) n += 1;
    if (normaliseIsoDateInput(dateToInput)) n += 1;
    if (statusFilters.length > 0) n += 1;
    if (parseMetricBound(metricMinInput) != null) n += 1;
    if (parseMetricBound(metricMaxInput) != null) n += 1;
    if (hasNotesOnly) n += 1;
    return n;
  }, [
    searchText,
    selectedCategoryId,
    dateFromInput,
    dateToInput,
    statusFilters,
    metricMinInput,
    metricMaxInput,
    hasNotesOnly,
  ]);

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
      const metricMin = parseMetricBound(metricMinInput);
      const metricMax = parseMetricBound(metricMaxInput);
      const whereClause = applicationsListWhere({
        searchRaw: searchText,
        categoryId: selectedCategoryId,
        dateFrom,
        dateTo,
        statuses: statusFilters,
        metricMin,
        metricMax,
        hasNotesOnly,
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
          categoryColor: categories.color,
        })
        .from(applications)
        .innerJoin(categories, eq(applications.categoryId, categories.id));

      const filtered = whereClause ? baseQuery.where(whereClause) : baseQuery;

      let data;
      switch (sortMode) {
        case 'date_asc':
          data = await filtered.orderBy(asc(applications.appliedDate), asc(applications.id));
          break;
        case 'company_az':
          data = await filtered.orderBy(asc(applications.company), asc(applications.role));
          break;
        case 'metric_desc':
          data = await filtered.orderBy(desc(applications.metricValue), desc(applications.appliedDate));
          break;
        default:
          data = await filtered.orderBy(desc(applications.appliedDate), desc(applications.id));
      }

      setRows(data);
    } finally {
      listHasLoadedRef.current = true;
      setShowInitialLoader(false);
      setListRefreshing(false);
    }
  }, [
    searchText,
    selectedCategoryId,
    dateFromInput,
    dateToInput,
    statusFilters,
    metricMinInput,
    metricMaxInput,
    hasNotesOnly,
    sortMode,
  ]);

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

  const toggleStatusFilter = (s: string) => {
    setStatusFilters((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const clearAllFilters = () => {
    setSearchText('');
    setSelectedCategoryId(null);
    setDateFromInput('');
    setDateToInput('');
    setStatusFilters([]);
    setMetricMinInput('');
    setMetricMaxInput('');
    setHasNotesOnly(false);
    setSortMode('date_desc');
  };

  const onExportCsv = () => {
    void (async () => {
      setExportBusy(true);
      try {
        const { rowCount } = await exportAndShareApplicationsCsv();
        if (exportBannerTimerRef.current) clearTimeout(exportBannerTimerRef.current);
        setExportBanner(
          rowCount === 0
            ? 'Export ready, file has headers only because no applications are saved yet.'
            : `Export ready, ${rowCount} application${rowCount === 1 ? '' : 's'} in your file.`,
        );
        exportBannerTimerRef.current = setTimeout(() => {
          setExportBanner(null);
          exportBannerTimerRef.current = null;
        }, 5000);
      } catch (err) {
        Alert.alert(
          'Export did not finish',
          err instanceof Error
            ? err.message
            : 'Could not create or share your file, please try again.',
        );
      } finally {
        setExportBusy(false);
      }
    })();
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

  // rubric: delete profile – wipe sqlite + session (no cloud)
  const onDeleteProfile = () => {
    Alert.alert(
      'Delete profile and all data on this device?',
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
                await resetHighContrastPreference();
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
      <ThemedView
        style={styles.centered}
        accessibilityLabel="Loading applications"
        accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={palette.tint} accessibilityElementsHidden />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  // render – hero + stat tiles (visual polish) then filters + list
  return (
    <ThemedView style={styles.flex}>
      <HeroBanner
        eyebrow="CareerBoost"
        title="Job Application Tracker"
        tagline="Private pipeline on this device, log roles, dates, and progress in one place."
      />
      <FlatList
        style={styles.listFlex}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHeaderBlock}>
        <View style={styles.topRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.topActions}
            accessibilityLabel="Application actions">
            <Pressable
              onPress={onAddPressed}
              accessibilityRole="button"
              accessibilityLabel="Add record"
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
                colorScheme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'
              }
              accessibilityHint="Saves your choice on this device. Use Match device to follow system light or dark again."
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
            {!followsSystem ? (
              <Pressable
                onPress={() => void resetToSystemTheme()}
                accessibilityRole="button"
                accessibilityLabel="Match device appearance"
                accessibilityHint="Clears saved light or dark preference and follows the phone or tablet setting again."
                style={({ pressed }) => [
                  styles.themeMatchBtn,
                  { borderColor: palette.borderSubtle, opacity: pressed ? 0.8 : 1 },
                ]}>
                <ThemedText style={[styles.themeMatchText, { color: palette.tint }]}>Match device</ThemedText>
              </Pressable>
            ) : null}
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
              accessibilityLabel="Delete profile and remove all data from this device"
              style={({ pressed }) => [
                styles.deleteAccountButton,
                {
                  opacity: pressed ? 0.88 : 1,
                  borderColor: colorScheme === 'dark' ? '#7f1d1d' : '#fecaca',
                  backgroundColor: colorScheme === 'dark' ? 'rgba(185,28,28,0.18)' : '#fef2f2',
                },
              ]}>
              <Ionicons name="person-remove-outline" size={18} color="#b91c1c" />
              <ThemedText style={styles.deleteAccountText}>Delete account</ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.themeHcRow}>
          <ThemedText style={[styles.themeHcLabel, { color: palette.text }]}>High contrast</ThemedText>
          <Switch
            value={highContrast}
            onValueChange={(v) => {
              if (v !== highContrast) toggleHighContrast();
            }}
            accessibilityLabel="High contrast colours"
            accessibilityHint="Stronger text and borders for readability. Saved on this device."
            trackColor={{ false: palette.barTrack, true: palette.tint }}
            thumbColor={colorScheme === 'dark' ? '#f4f4f5' : '#ffffff'}
          />
        </View>

        <View style={styles.themeBanner} accessibilityLiveRegion="polite">
          <ThemedText style={[styles.themeBannerText, { color: palette.icon }]}>
            {followsSystem
              ? `Appearance: matching device (${colorScheme === 'dark' ? 'dark' : 'light'})${highContrast ? ', high contrast on' : ''}.`
              : `Appearance: ${colorScheme === 'dark' ? 'Dark' : 'Light'} (saved on this device)${highContrast ? ', high contrast on' : ''}.`}
          </ThemedText>
        </View>

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
              {
                label: 'Filters on',
                value: activeFilterCount,
                icon: 'funnel-outline',
                accessibilityLabel: `Active filter groups, ${activeFilterCount}`,
              },
            ]}
          />
        </View>

        <View
          style={[styles.filterPanel, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}>
          <View style={styles.filterPanelHead}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
                Search and filters
              </ThemedText>
              <ThemedText style={[styles.filterKicker, { color: palette.icon }]}>
                Matching uses your saved records, text, dates, category, pipeline status, metric range, and notes.
              </ThemedText>
            </View>
            {hasActiveFilters ? (
              <Pressable
                onPress={clearAllFilters}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters and reset sort to newest first"
                style={({ pressed }) => [
                  styles.clearAllBtn,
                  { borderColor: palette.tint, opacity: pressed ? 0.82 : 1 },
                ]}>
                <ThemedText style={[styles.clearAllBtnText, { color: palette.tint }]}>Clear all</ThemedText>
              </Pressable>
            ) : null}
          </View>

          <ThemedText style={[styles.activeHint, { color: palette.icon }]}>
            {activeFilterCount === 0
              ? 'No filters applied, showing every saved record (newest first).'
              : `${activeFilterCount} filter group${activeFilterCount === 1 ? '' : 's'} active.`}
          </ThemedText>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Text search (company, role, status, notes)
        </ThemedText>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="e.g. bank, Offer, phone screen…"
          placeholderTextColor={palette.icon}
          accessibilityLabel="Search company role status and notes"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.searchInput,
            {
              color: palette.text,
              borderColor: palette.borderSubtle,
              backgroundColor: palette.surfaceCard,
            },
          ]}
        />

        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Sort list
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {(
            [
              { id: 'date_desc' as const, label: 'Newest first' },
              { id: 'date_asc' as const, label: 'Oldest first' },
              { id: 'company_az' as const, label: 'Company A–Z' },
              { id: 'metric_desc' as const, label: 'Highest metric' },
            ] as const
          ).map((opt) => {
            const sel = sortMode === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSortMode(opt.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`Sort ${opt.label}`}
                style={({ pressed }) => [
                  styles.sortChip,
                  {
                    borderColor: sel ? palette.tint : palette.icon,
                    backgroundColor: sel ? `${palette.tint}22` : palette.surfaceCard,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText style={[styles.sortChipText, { fontWeight: sel ? '800' : '600', color: palette.text }]}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Quick date range
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
          <Pressable
            onPress={() => {
              const { from, to } = presetLastNDays(7);
              setDateFromInput(from);
              setDateToInput(to);
            }}
            accessibilityRole="button"
            accessibilityLabel="Set date filter to last 7 days"
            style={({ pressed }) => [
              styles.presetChip,
              { borderColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={[styles.presetChipText, { color: palette.tint }]}>Last 7 days</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              const { from, to } = presetLastNDays(30);
              setDateFromInput(from);
              setDateToInput(to);
            }}
            accessibilityRole="button"
            accessibilityLabel="Set date filter to last 30 days"
            style={({ pressed }) => [
              styles.presetChip,
              { borderColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={[styles.presetChipText, { color: palette.tint }]}>Last 30 days</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              const { from, to } = presetThisMonthRange();
              setDateFromInput(from);
              setDateToInput(to);
            }}
            accessibilityRole="button"
            accessibilityLabel="Set date filter to this calendar month"
            style={({ pressed }) => [
              styles.presetChip,
              { borderColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={[styles.presetChipText, { color: palette.tint }]}>This month</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              const { from, to } = presetThisYearRange();
              setDateFromInput(from);
              setDateToInput(to);
            }}
            accessibilityRole="button"
            accessibilityLabel="Set date filter to this calendar year"
            style={({ pressed }) => [
              styles.presetChip,
              { borderColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={[styles.presetChipText, { color: palette.tint }]}>This year</ThemedText>
          </Pressable>
        </ScrollView>

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
            style={[
              styles.dateInput,
              {
                color: palette.text,
                borderColor: palette.borderSubtle,
                backgroundColor: palette.surfaceCard,
              },
            ]}
          />
          <TextInput
            value={dateToInput}
            onChangeText={setDateToInput}
            placeholder="To YYYY-MM-DD"
            placeholderTextColor={palette.icon}
            accessibilityLabel="Filter applications applied on or before this date"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.dateInput,
              {
                color: palette.text,
                borderColor: palette.borderSubtle,
                backgroundColor: palette.surfaceCard,
              },
            ]}
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
          Primary metric (optional range)
        </ThemedText>
        <View style={styles.dateRow}>
          <TextInput
            value={metricMinInput}
            onChangeText={setMetricMinInput}
            placeholder="Min (e.g. 1)"
            placeholderTextColor={palette.icon}
            keyboardType="number-pad"
            accessibilityLabel="Minimum primary metric inclusive"
            style={[
              styles.dateInput,
              {
                color: palette.text,
                borderColor: palette.borderSubtle,
                backgroundColor: palette.surfaceCard,
              },
            ]}
          />
          <TextInput
            value={metricMaxInput}
            onChangeText={setMetricMaxInput}
            placeholder="Max (e.g. 120)"
            placeholderTextColor={palette.icon}
            keyboardType="number-pad"
            accessibilityLabel="Maximum primary metric inclusive"
            style={[
              styles.dateInput,
              {
                color: palette.text,
                borderColor: palette.borderSubtle,
                backgroundColor: palette.surfaceCard,
              },
            ]}
          />
        </View>
        {metricMinInput.trim() && parseMetricBound(metricMinInput) === null ? (
          <ThemedText style={styles.warnText}>Min metric: use a whole number ≥ 1.</ThemedText>
        ) : null}
        {metricMaxInput.trim() && parseMetricBound(metricMaxInput) === null ? (
          <ThemedText style={styles.warnText}>Max metric: use a whole number ≥ 1.</ThemedText>
        ) : null}

        <View style={styles.notesFilterRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
              Only records with notes
            </ThemedText>
            <ThemedText style={[styles.filterKicker, { color: palette.icon }]}>
              Hides rows where notes are empty, still combined with other filters.
            </ThemedText>
          </View>
          <Switch
            value={hasNotesOnly}
            onValueChange={setHasNotesOnly}
            accessibilityLabel="Toggle filter to only applications with notes"
          />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Pipeline status (multi-select)
        </ThemedText>
        <ThemedText style={[styles.filterKicker, { color: palette.icon, marginBottom: 6 }]}>
          Tap statuses to include; leave none selected to show every status.
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {APPLICATION_STATUSES.map((s) => {
            const selected = statusFilters.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleStatusFilter(s)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filter status ${s}`}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: selected ? palette.tint : palette.icon,
                    backgroundColor: selected ? `${palette.tint}22` : palette.surfaceCard,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText style={[styles.chipText, { fontWeight: selected ? '800' : '500' }]}>{s}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

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
                  selectedCategoryId === null ? `${palette.tint}22` : palette.surfaceCard,
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
                    backgroundColor: selected ? `${palette.tint}22` : palette.surfaceCard,
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

      <View style={styles.applicationsSectionHead}>
        <ThemedText type="defaultSemiBold" style={[styles.applicationsTitle, { color: palette.text }]}>
          Job applications
        </ThemedText>
        <Pressable
          onPress={onExportCsv}
          disabled={exportBusy}
          accessibilityRole="button"
          accessibilityLabel="Export all saved applications as CSV"
          accessibilityHint="Creates one file with every stored application, not only the filtered list, then opens share or download."
          accessibilityState={{ busy: exportBusy }}
          style={({ pressed }) => [
            styles.exportCsvBtn,
            {
              borderColor: palette.tint,
              opacity: exportBusy ? 0.55 : pressed ? 0.85 : 1,
            },
          ]}>
          {exportBusy ? (
            <ActivityIndicator size="small" color={palette.tint} accessibilityElementsHidden />
          ) : (
            <Ionicons name="download-outline" size={18} color={palette.tint} accessibilityElementsHidden />
          )}
          <ThemedText style={[styles.exportCsvBtnText, { color: palette.tint }]}>
            {exportBusy ? 'Working' : 'Export CSV'}
          </ThemedText>
        </Pressable>
      </View>

      {exportBanner ? (
        <View
          style={[styles.exportBanner, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}
          accessibilityRole="text"
          accessibilityLabel={exportBanner}>
          <Ionicons name="checkmark-circle-outline" size={18} color={palette.tint} accessibilityElementsHidden />
          <ThemedText style={[styles.exportBannerText, { color: palette.text }]}>{exportBanner}</ThemedText>
        </View>
      ) : null}

          </View>
        }
        contentContainerStyle={[
          styles.listScroll,
          rows.length === 0 ? styles.listEmptyGrow : null,
        ]}
        ListEmptyComponent={
          <EmptyStateCard
            icon={hasActiveFilters ? 'funnel-outline' : 'briefcase-outline'}
            title={hasActiveFilters ? 'No matches' : 'No records yet'}
            message={
              hasActiveFilters
                ? 'Loosen text, dates, category, statuses, metric range, or notes filter, or tap Clear all, to see matches again.'
                : 'Tap Add to create your first record (date, primary metric, category). Everything stays on this device.'
            }
            accessibilityHint={
              hasActiveFilters
                ? 'Use Clear all in the Search and filters panel above the list.'
                : 'Use the Add button in the top actions row to open the new record form.'
            }
            tint={palette.tint}
            surface={palette.surfaceCard}
            border={palette.borderSubtle}
            textColor={palette.text}
            mutedColor={palette.icon}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit record: ${item.company}, ${item.role}. Applied ${item.appliedDate}. Primary metric ${item.metricValue}. Category ${item.categoryName}. Status ${item.status}. Opens edit and status history.`}
            onPress={() => router.push({ pathname: '/edit-application', params: { id: String(item.id) } })}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
            <View
              style={[
                styles.card,
                cardShadowStyle,
                {
                  borderColor: palette.borderSubtle,
                  backgroundColor: palette.surfaceCard,
                },
              ]}>
              <View style={styles.cardRow}>
                <View
                  style={[styles.cardAccent, { backgroundColor: item.categoryColor }]}
                  accessibilityElementsHidden
                />
                <View style={styles.cardMain}>
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
                    {item.appliedDate} • primary metric {item.metricValue} • {item.categoryName}
                  </ThemedText>
                </View>
              </View>
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
  listHeaderBlock: { gap: 8, paddingTop: 10 },
  filterPanel: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 4 },
  filterPanelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  filterKicker: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 4 },
  clearAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearAllBtnText: { fontWeight: '800', fontSize: 13 },
  activeHint: { fontSize: 13, fontWeight: '600' },
  sortRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  sortChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  sortChipText: { fontSize: 13 },
  presetRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  presetChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  presetChipText: { fontWeight: '800', fontSize: 13 },
  notesFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
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
  applicationsSectionHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  applicationsTitle: { fontSize: 17, flexShrink: 1 },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportCsvBtnText: { fontWeight: '700', fontSize: 14 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 2,
  },
  themeHcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  themeHcLabel: { fontSize: 15, fontWeight: '700' },
  themeBanner: { marginBottom: 4 },
  themeBannerText: { fontSize: 13, fontWeight: '600' },
  themeMatchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeMatchText: { fontWeight: '700', fontSize: 13 },
  exportBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  exportBannerText: { flex: 1, flexBasis: 200, minWidth: 0, fontSize: 14, fontWeight: '600' },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingRight: 4,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  deleteAccountText: { color: '#b91c1c', fontWeight: '800', fontSize: 14 },
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
  listFlex: { flex: 1 },
  listScroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  listEmptyGrow: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  cardAccent: { width: 5 },
  cardMain: { flex: 1, paddingVertical: 14, paddingRight: 14, paddingLeft: 12, gap: 6 },
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
