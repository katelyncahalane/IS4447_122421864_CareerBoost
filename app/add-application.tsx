// add application screen – insert one job application into sqlite (create in crud)

// imports – react, native ui, app bits
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FormField from '@/components/ui/form-field';
import { db } from '@/db/client';
import { applicationStatusLogs, applications, categories } from '@/db/schema';
import { useThemePalette } from '@/hooks/use-theme-palette';
import type { ApplicationFormErrors } from '@/lib/validate-application-form';
import type { ApplicationStatus } from '@/lib/application-statuses';
import { APPLICATION_STATUSES } from '@/lib/application-statuses';
import { loadPrefsAndSyncReminders } from '@/lib/local-reminders';
import { validateApplicationForm } from '@/lib/validate-application-form';
import { asc } from 'drizzle-orm';
import { Stack, useRouter } from 'expo-router';

// types – one row from categories table for the picker
type CategoryRow = { id: number; name: string; color: string; icon: string };

// helper – today as yyyy-mm-dd (local date, good enough for coursework)
function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// screen – form + save + category modal
export default function AddApplicationScreen() {
  const router = useRouter();
  const palette = useThemePalette();

  // state – categories list + modal + form fields
  const [loadingCats, setLoadingCats] = useState(true);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [appliedDate, setAppliedDate] = useState(isoToday());
  const [metricValue, setMetricValue] = useState('1');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');

  const [categoryId, setCategoryId] = useState<number | null>(null);

  // state – inline validation messages (clear as user edits)
  const [fieldErrors, setFieldErrors] = useState<ApplicationFormErrors>({});

  // derived – which category name to show on the button
  const selectedCategory = useMemo(
    () => cats.find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  // effect – load categories once for the picker
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

  // handler – validate then insert application + first status log
  const onSave = async () => {
    const check = validateApplicationForm({
      company,
      role,
      appliedDate,
      metricValue,
      categoryId,
    });
    if (!check.ok) {
      setFieldErrors(check.errors);
      return;
    }
    setFieldErrors({});
    const {
      company: trimmedCompany,
      role: trimmedRole,
      appliedDate: trimmedDate,
      metricValue: parsedMetric,
      categoryId: chosenCategoryId,
    } = check.values;

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
          categoryId: chosenCategoryId,
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
      if (Platform.OS !== 'web') {
        void loadPrefsAndSyncReminders().catch(() => {});
      }
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  // render – scroll form + slide-up category chooser
  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Add record' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {loadingCats ? (
          <View style={styles.centeredRow}>
            <ActivityIndicator color={palette.tint} />
            <ThemedText style={styles.muted}>Loading categories…</ThemedText>
          </View>
        ) : null}

        <View style={[styles.storyCard, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}>
          <ThemedText type="defaultSemiBold">What goes in a record</ThemedText>
          <ThemedText style={[styles.storyLead, { color: palette.icon }]}>
            Required: date applied, one primary metric (a whole number, duration like minutes or hours, or a count), and a
            category. Optional: notes. Company, role, and status describe the application itself.
          </ThemedText>
          <View style={styles.storyList}>
            <ThemedText style={[styles.storyItem, { color: palette.text }]}>
              Metric examples: 45 (minutes on the application), 2 (follow-ups logged), 8 (prep hours). Category is
              required so every stored row can drive charts and filters consistently. Set the starting pipeline status,
              extend history anytime from Edit.
            </ThemedText>
          </View>
        </View>

        <FormField
          label="Company"
          value={company}
          onChangeText={(v) => {
            setCompany(v);
            setFieldErrors((e) => ({ ...e, company: undefined }));
          }}
          placeholder="e.g. Northwind Retail"
          autoCapitalize="words"
          errorText={fieldErrors.company}
        />
        <FormField
          label="Role"
          value={role}
          onChangeText={(v) => {
            setRole(v);
            setFieldErrors((e) => ({ ...e, role: undefined }));
          }}
          placeholder="e.g. Junior React Native Developer"
          autoCapitalize="words"
          errorText={fieldErrors.role}
        />
        <FormField
          label="Date applied (YYYY-MM-DD)"
          hint="Required. Use the calendar day you sent the application (used for timelines and streaks)."
          value={appliedDate}
          onChangeText={(v) => {
            setAppliedDate(v);
            setFieldErrors((e) => ({ ...e, appliedDate: undefined }));
          }}
          placeholder="2026-04-26"
          keyboardType="numeric"
          autoCapitalize="none"
          errorText={fieldErrors.appliedDate}
        />
        <FormField
          label="Primary metric"
          hint="Required. One positive whole number, interpret as duration (e.g. minutes) or a count (e.g. stages), whichever you track for this application."
          value={metricValue}
          onChangeText={(v) => {
            setMetricValue(v);
            setFieldErrors((e) => ({ ...e, metricValue: undefined }));
          }}
          placeholder="e.g. 30 or 1"
          keyboardType="numeric"
          autoCapitalize="none"
          errorText={fieldErrors.metricValue}
        />

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Category (required)</ThemedText>
          <ThemedText style={[styles.fieldHint, { color: palette.icon }]}>
            Choose how this record is grouped for insights (you can change it later).
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select category"
            accessibilityHint={fieldErrors.category ?? undefined}
            onPress={() => setCategoryModalOpen(true)}
            style={({ pressed }) => [
              styles.select,
              {
                borderColor: fieldErrors.category ? '#c00' : palette.icon,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <ThemedText>
              {selectedCategory ? selectedCategory.name : cats.length ? 'Select…' : 'No categories yet'}
            </ThemedText>
          </Pressable>
          {fieldErrors.category ? <ThemedText style={styles.errorText}>{fieldErrors.category}</ThemedText> : null}
        </View>

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Status</ThemedText>
          <View style={styles.statusRow}>
            {APPLICATION_STATUSES.map((s) => {
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
            accessibilityLabel="Save record"
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
                    onPress={() => {
                      setCategoryId(c.id);
                      setFieldErrors((e) => ({ ...e, category: undefined }));
                    }}
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

// styles – layout only (colours mostly from theme at runtime)
const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 14 },
  storyCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  storyLead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  storyList: { flexDirection: 'column', gap: 6 },
  storyItem: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  fieldHint: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  centeredRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.8 },
  errorText: { color: '#c00', fontSize: 13 },
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
