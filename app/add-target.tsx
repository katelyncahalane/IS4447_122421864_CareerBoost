// add target – weekly or monthly application-count goal; global or per-category (`targets` in SQLite / Drizzle).

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { db } from '@/db/client';
import { categories, targets } from '@/db/schema';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { currentMonthStartIso, currentWeekStartIso } from '@/lib/target-streak';
import { asc } from 'drizzle-orm';
import { Stack, useRouter } from 'expo-router';

type CategoryRow = { id: number; name: string; color: string };

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

export default function AddTargetScreen() {
  const router = useRouter();
  const palette = useThemePalette();

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [catModal, setCatModal] = useState(false);

  const [scope, setScope] = useState<'global' | 'category'>('global');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [periodStart, setPeriodStart] = useState(currentWeekStartIso());
  const [goalCount, setGoalCount] = useState('5');
  const [title, setTitle] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const rows = await db
          .select({ id: categories.id, name: categories.name, color: categories.color })
          .from(categories)
          .orderBy(asc(categories.name));
        setCats(rows);
        setCategoryId((prev) => prev ?? rows[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPeriodStart(periodType === 'week' ? currentWeekStartIso() : currentMonthStartIso());
  }, [periodType]);

  const selectedCat = useMemo(() => cats.find((c) => c.id === categoryId) ?? null, [cats, categoryId]);

  const onSave = async () => {
    const g = Number.parseInt(goalCount, 10);
    if (!Number.isFinite(g) || g < 1) {
      Alert.alert('Check goal', 'Enter a whole number goal of at least 1 application.');
      return;
    }
    if (!isIsoDate(periodStart)) {
      Alert.alert('Check period', 'Use period start as YYYY-MM-DD (week = Monday, month = 1st).');
      return;
    }
    if (scope === 'category' && categoryId == null) {
      Alert.alert('Category', 'Pick a category for this target.');
      return;
    }
    try {
      await db.insert(targets).values({
        title: title.trim() ? title.trim() : null,
        scope,
        categoryId: scope === 'global' ? null : categoryId,
        periodType,
        periodStart: periodStart.trim(),
        goalCount: g,
        createdAt: Date.now(),
      });
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Add target' }} />
        <ActivityIndicator color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Add target' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.callout, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}>
          <ThemedText type="defaultSemiBold">What this does</ThemedText>
          <ThemedText style={[styles.calloutText, { color: palette.icon }]}>
            Define a minimum number of applications for a calendar week (Monday start) or full calendar month. Choose
            all categories or one track. The Targets tab shows how many you have logged in that window, how many are
            left to hit the goal, and clear states when you meet or exceed it, all from stored application dates only.
          </ThemedText>
        </View>

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Scope</ThemedText>
          <ThemedText style={[styles.fieldHint, { color: palette.icon }]}>
            Global counts every saved application in the period; one category counts only that track.
          </ThemedText>
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setScope('global')}
              accessibilityRole="button"
              accessibilityState={{ selected: scope === 'global' }}
              accessibilityLabel="Global target all categories"
              style={({ pressed }) => [
                styles.seg,
                {
                  borderColor: scope === 'global' ? palette.tint : palette.icon,
                  backgroundColor: scope === 'global' ? `${palette.tint}22` : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText style={{ fontWeight: scope === 'global' ? '800' : '600' }}>Global</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setScope('category')}
              accessibilityRole="button"
              accessibilityState={{ selected: scope === 'category' }}
              accessibilityLabel="Per category target"
              style={({ pressed }) => [
                styles.seg,
                {
                  borderColor: scope === 'category' ? palette.tint : palette.icon,
                  backgroundColor: scope === 'category' ? `${palette.tint}22` : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText style={{ fontWeight: scope === 'category' ? '800' : '600' }}>Per category</ThemedText>
            </Pressable>
          </View>
        </View>

        {scope === 'category' ? (
          <View style={styles.fieldBlock}>
            <ThemedText type="defaultSemiBold">Category</ThemedText>
            <Pressable
              onPress={() => setCatModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose category for target"
              style={({ pressed }) => [
                styles.select,
                { borderColor: palette.icon, opacity: pressed ? 0.85 : 1 },
              ]}>
              <View style={[styles.swatch, { backgroundColor: selectedCat?.color ?? '#ccc' }]} />
              <ThemedText>{selectedCat?.name ?? 'Select…'}</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Period</ThemedText>
          <ThemedText style={[styles.fieldHint, { color: palette.icon }]}>
            Weekly = Monday–Sunday window; monthly = whole calendar month containing the start date.
          </ThemedText>
          <View style={styles.segmentRow}>
            {(['week', 'month'] as const).map((p) => {
              const sel = periodType === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPeriodType(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={p === 'week' ? 'Weekly target' : 'Monthly target'}
                  style={({ pressed }) => [
                    styles.seg,
                    {
                      flex: 1,
                      borderColor: sel ? palette.tint : palette.icon,
                      backgroundColor: sel ? `${palette.tint}22` : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <ThemedText style={{ fontWeight: sel ? '800' : '600', textAlign: 'center' }}>
                    {p === 'week' ? 'Week' : 'Month'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Period start (YYYY-MM-DD)</ThemedText>
          <ThemedText style={[styles.fieldHint, { color: palette.icon }]}>
            For weeks, use the Monday of that week; for months, use the first day of the month (quick buttons set this
            for you).
          </ThemedText>
          <View style={styles.quickRow}>
            <Pressable
              onPress={() => setPeriodStart(currentWeekStartIso())}
              accessibilityRole="button"
              accessibilityLabel="Set start to this Monday"
              style={({ pressed }) => [styles.chip, { borderColor: palette.tint, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>This week (Mon)</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setPeriodStart(currentMonthStartIso())}
              accessibilityRole="button"
              accessibilityLabel="Set start to first of this month"
              style={({ pressed }) => [styles.chip, { borderColor: palette.tint, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>This month (1st)</ThemedText>
            </Pressable>
          </View>
          <TextInput
            value={periodStart}
            onChangeText={setPeriodStart}
            placeholder="2026-04-06"
            placeholderTextColor={palette.icon}
            accessibilityLabel="Period start date"
            autoCapitalize="none"
            style={[
              styles.input,
              { color: palette.text, borderColor: palette.borderSubtle, backgroundColor: palette.surfaceCard },
            ]}
          />
        </View>

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Goal (application count)</ThemedText>
          <ThemedText style={[styles.fieldHint, { color: palette.icon }]}>
            Minimum whole number of applications with applied dates in the window. Progress on Targets shows remaining
            to this number, or how far past it you are.
          </ThemedText>
          <TextInput
            value={goalCount}
            onChangeText={setGoalCount}
            keyboardType="number-pad"
            accessibilityLabel="Target number of applications"
            style={[
              styles.input,
              { color: palette.text, borderColor: palette.borderSubtle, backgroundColor: palette.surfaceCard },
            ]}
          />
        </View>

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Title (optional)</ThemedText>
          <ThemedText style={[styles.fieldHint, { color: palette.icon }]}>
            Short label in the list; if empty, a default title is generated from period and scope.
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Software roles this week"
            placeholderTextColor={palette.icon}
            accessibilityLabel="Optional short title for this target"
            style={[
              styles.input,
              { color: palette.text, borderColor: palette.borderSubtle, backgroundColor: palette.surfaceCard },
            ]}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void onSave()}
            accessibilityRole="button"
            accessibilityLabel="Save target"
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: palette.tint, opacity: pressed ? 0.88 : 1 },
            ]}>
            <ThemedText style={styles.primaryText}>Save target</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.secondary, { borderColor: palette.icon, opacity: pressed ? 0.85 : 1 }]}>
            <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={catModal} animationType="slide" onRequestClose={() => setCatModal(false)} presentationStyle="pageSheet">
        <ThemedView style={styles.modal}>
          <View style={styles.modalHead}>
            <ThemedText type="subtitle">Category</ThemedText>
            <Pressable onPress={() => setCatModal(false)} accessibilityRole="button" accessibilityLabel="Done">
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Done</ThemedText>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
            {cats.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCategoryId(c.id);
                  setCatModal(false);
                }}
                style={({ pressed }) => [
                  styles.catRow,
                  { borderColor: c.id === categoryId ? palette.tint : palette.borderSubtle, opacity: pressed ? 0.9 : 1 },
                ]}>
                <View style={[styles.swatch, { backgroundColor: c.color }]} />
                <ThemedText style={{ flex: 1 }}>{c.name}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { opacity: 0.85 },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  callout: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  calloutText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  fieldHint: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  fieldBlock: { gap: 8 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  actions: { gap: 10, marginTop: 4 },
  primary: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  modal: { flex: 1, paddingTop: 16 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
});
