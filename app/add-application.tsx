/**
 * Add Job Application screen (Records: Create).
 *
 * References:
 * - Expo Router screens: https://docs.expo.dev/router/advanced/stack/
 * - Drizzle insert (SQLite): https://orm.drizzle.team/docs/insert
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FormField from '@/components/ui/form-field';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applicationStatusLogs, applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { asc } from 'drizzle-orm';
import { Stack, useRouter } from 'expo-router';

type CategoryRow = { id: number; name: string; color: string; icon: string };

const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'] as const;

function isoToday(): string {
  // YYYY-MM-DD in local timezone
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AddApplicationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const [loadingCats, setLoadingCats] = useState(true);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [appliedDate, setAppliedDate] = useState(isoToday());
  const [metricValue, setMetricValue] = useState('1');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('Applied');

  const [categoryId, setCategoryId] = useState<number | null>(null);

  const selectedCategory = useMemo(
    () => cats.find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setLoadingCats(true);
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
        if (!mounted) return;
        setCats(data);
        setCategoryId((prev) => prev ?? (data[0]?.id ?? null));
      } finally {
        if (mounted) setLoadingCats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();
    const trimmedDate = appliedDate.trim();
    const parsedMetric = Number.parseInt(metricValue, 10);

    if (!trimmedCompany || !trimmedRole) {
      Alert.alert('Missing fields', 'Company and role are required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD.');
      return;
    }
    if (!Number.isFinite(parsedMetric) || parsedMetric <= 0) {
      Alert.alert('Invalid metric', 'Metric must be a positive number.');
      return;
    }
    if (categoryId == null) {
      Alert.alert('Missing category', 'Please select a category.');
      return;
    }

    try {
      const now = Date.now();
      const inserted = await db
        .insert(applications)
        .values({
          company: trimmedCompany,
          role: trimmedRole,
          status,
          appliedDate: trimmedDate,
          metricValue: parsedMetric,
          categoryId,
          notes: notes.trim() ? notes.trim() : null,
          createdAt: now,
        })
        .returning({ id: applications.id });

      const newId = inserted[0]?.id;
      if (newId != null) {
        await db.insert(applicationStatusLogs).values({
          applicationId: newId,
          status,
          note: 'Created',
          createdAt: now,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Add application' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {loadingCats ? (
          <View style={styles.centeredRow}>
            <ActivityIndicator color={palette.tint} />
            <ThemedText style={styles.muted}>Loading categories…</ThemedText>
          </View>
        ) : null}

        <FormField
          label="Company"
          value={company}
          onChangeText={setCompany}
          placeholder="e.g. Northwind Retail"
          autoCapitalize="words"
        />
        <FormField
          label="Role"
          value={role}
          onChangeText={setRole}
          placeholder="e.g. Junior React Native Developer"
          autoCapitalize="words"
        />
        <FormField
          label="Applied date (YYYY-MM-DD)"
          value={appliedDate}
          onChangeText={setAppliedDate}
          placeholder="2026-04-26"
          keyboardType="numeric"
          autoCapitalize="none"
        />
        <FormField
          label="Metric value"
          value={metricValue}
          onChangeText={setMetricValue}
          placeholder="e.g. 1"
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Category</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select category"
            onPress={() => setCategoryModalOpen(true)}
            style={({ pressed }) => [
              styles.select,
              { borderColor: palette.icon, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText>
              {selectedCategory ? selectedCategory.name : cats.length ? 'Select…' : 'No categories yet'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Status</ThemedText>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const selected = s === status;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={`Set status ${s}`}
                  onPress={() => setStatus(s)}
                  style={({ pressed }) => [
                    styles.statusChip,
                    {
                      borderColor: selected ? palette.tint : palette.icon,
                      backgroundColor: selected ? `${palette.tint}22` : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <ThemedText style={{ color: selected ? palette.tint : palette.text }}>{s}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any extra details…"
          multiline
          autoCapitalize="sentences"
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save application"
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
            ]}>
            <ThemedText style={styles.primaryText}>Save</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={styles.secondaryText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={categoryModalOpen}
        animationType="slide"
        onRequestClose={() => setCategoryModalOpen(false)}
        presentationStyle="pageSheet">
        <ThemedView style={styles.modal}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">Select category</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close category selector"
              onPress={() => setCategoryModalOpen(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Done</ThemedText>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {cats.length === 0 ? (
              <ThemedText style={styles.muted}>No categories found (seed should create some).</ThemedText>
            ) : (
              cats.map((c) => {
                const selected = c.id === categoryId;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose category ${c.name}`}
                    onPress={() => setCategoryId(c.id)}
                    style={({ pressed }) => [
                      styles.categoryRow,
                      {
                        borderColor: selected ? palette.tint : palette.icon,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <View style={[styles.colorDot, { backgroundColor: c.color }]} />
                    <ThemedText style={{ flex: 1 }}>{c.name}</ThemedText>
                    {selected ? <ThemedText style={{ color: palette.tint }}>Selected</ThemedText> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 14 },
  centeredRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.8 },
  fieldBlock: { gap: 6 },
  select: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actions: { gap: 10, marginTop: 6 },
  primaryButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#999',
  },
  secondaryText: { fontWeight: '600' },
  modal: { flex: 1, padding: 16, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalBody: { paddingTop: 8, gap: 10, paddingBottom: 16 },
  categoryRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
});

