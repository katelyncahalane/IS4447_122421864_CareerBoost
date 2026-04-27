// edit application screen – update or delete one row (update / delete in crud)

// imports
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
import { StatusTimeline, type StatusLogRow } from '@/components/application/status-timeline';
import FormField from '@/components/ui/form-field';
import { db } from '@/db/client';
import { applicationStatusLogs, applications, categories } from '@/db/schema';
import { useThemePalette } from '@/hooks/use-theme-palette';
import type { ApplicationStatus } from '@/lib/application-statuses';
import { APPLICATION_STATUSES } from '@/lib/application-statuses';
import type { ApplicationFormErrors } from '@/lib/validate-application-form';
import { validateApplicationForm } from '@/lib/validate-application-form';
import { asc, eq } from 'drizzle-orm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

// types
type CategoryRow = { id: number; name: string; color: string; icon: string };

// screen
export default function EditApplicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number.parseInt(params.id ?? '', 10);

  const palette = useThemePalette();

  // state
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [appliedDate, setAppliedDate] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [initialStatus, setInitialStatus] = useState<ApplicationStatus>('Applied');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [statusLogs, setStatusLogs] = useState<StatusLogRow[]>([]);
  const [statusChangeNote, setStatusChangeNote] = useState('');

  const [fieldErrors, setFieldErrors] = useState<ApplicationFormErrors>({});

  // derived
  const selectedCategory = useMemo(
    () => cats.find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  // effect – load categories + this application by id from route
  useEffect(() => {
    if (!Number.isFinite(id)) {
      Alert.alert('Invalid link', 'Missing application id.');
      router.back();
      return;
    }

    let mounted = true;
    void (async () => {
      setLoading(true);
      try {
        const [catData, appData, logData] = await Promise.all([
          db
            .select({
              id: categories.id,
              name: categories.name,
              color: categories.color,
              icon: categories.icon,
            })
            .from(categories)
            .orderBy(asc(categories.name)),
          db
            .select({
              company: applications.company,
              role: applications.role,
              appliedDate: applications.appliedDate,
              metricValue: applications.metricValue,
              categoryId: applications.categoryId,
              notes: applications.notes,
              status: applications.status,
            })
            .from(applications)
            .where(eq(applications.id, id))
            .limit(1),
          db
            .select({
              id: applicationStatusLogs.id,
              status: applicationStatusLogs.status,
              note: applicationStatusLogs.note,
              createdAt: applicationStatusLogs.createdAt,
            })
            .from(applicationStatusLogs)
            .where(eq(applicationStatusLogs.applicationId, id))
            .orderBy(asc(applicationStatusLogs.createdAt)),
        ]);

        if (!mounted) return;
        setCats(catData);

        const row = appData[0];
        if (!row) {
          Alert.alert('Not found', 'That application no longer exists.');
          router.back();
          return;
        }

        setCompany(row.company);
        setRole(row.role);
        setAppliedDate(row.appliedDate);
        setMetricValue(String(row.metricValue));
        setCategoryId(row.categoryId);
        setNotes(row.notes ?? '');
        const raw = row.status as string;
        const s = (APPLICATION_STATUSES as readonly string[]).includes(raw)
          ? (raw as ApplicationStatus)
          : 'Applied';
        setStatus(s);
        setInitialStatus(s);
        setStatusLogs(logData);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, router]);

  // handler – save edits; append status log only if status changed
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
      await db
        .update(applications)
        .set({
          company: trimmedCompany,
          role: trimmedRole,
          status,
          appliedDate: trimmedDate,
          metricValue: parsedMetric,
          categoryId: chosenCategoryId,
          notes: notes.trim() ? notes.trim() : null,
        })
        .where(eq(applications.id, id));

      if (status !== initialStatus) {
        const noteText = statusChangeNote.trim() || 'Status updated';
        await db.insert(applicationStatusLogs).values({
          applicationId: id,
          status,
          note: noteText,
          createdAt: now,
        });
      }

      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  // handler – delete logs first so foreign keys do not block delete
  const onDelete = () => {
    Alert.alert('Delete this record?', 'This removes the application row, notes, and its full status history from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.transaction(async (tx) => {
              await tx.delete(applicationStatusLogs).where(eq(applicationStatusLogs.applicationId, id));
              await tx.delete(applications).where(eq(applications.id, id));
            });
            router.back();
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  // render – loading gate
  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Edit record' }} />
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  // render – main form + category modal
  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Edit record' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.storyCard, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}>
          <ThemedText type="defaultSemiBold">Edit this record</ThemedText>
          <ThemedText style={[styles.storyLine, { color: palette.icon }]}>
            Adjust date, primary metric, category, company, role, or notes. Change pipeline status when you move forward.
            Your timeline stays below. Delete removes this record and its history.
          </ThemedText>
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
          hint="Required. Calendar day you sent the application."
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
          hint="Required. One positive whole number, duration (e.g. minutes) or a count, same meaning you used when you created the record."
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
            Grouping for charts and filters, change if you recategorise this application.
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
            <ThemedText>{selectedCategory ? selectedCategory.name : 'Select…'}</ThemedText>
          </Pressable>
          {fieldErrors.category ? <ThemedText style={styles.errorText}>{fieldErrors.category}</ThemedText> : null}
        </View>

        <StatusTimeline
          logs={statusLogs}
          palette={{
            tint: palette.tint,
            text: palette.text,
            icon: palette.icon,
            borderSubtle: palette.borderSubtle,
            surfaceMuted: palette.surfaceMuted,
            surfaceCard: palette.surfaceCard,
          }}
        />

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

        {status !== initialStatus ? (
          <FormField
            label="Note for this status change (optional)"
            value={statusChangeNote}
            onChangeText={setStatusChangeNote}
            placeholder="e.g. Phone screen booked Tuesday"
            multiline
            autoCapitalize="sentences"
          />
        ) : null}

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
            accessibilityLabel="Save record changes"
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
            ]}>
            <ThemedText style={styles.primaryText}>Save</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete application"
            onPress={onDelete}
            style={({ pressed }) => [styles.dangerButton, { opacity: pressed ? 0.75 : 1 }]}>
            <ThemedText style={styles.dangerText}>Delete</ThemedText>
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
            {cats.map((c) => {
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
            })}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  body: { padding: 16, gap: 14 },
  storyCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  storyLine: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  fieldHint: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
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
  dangerButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c00',
  },
  dangerText: { fontWeight: '700', color: '#c00' },
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
