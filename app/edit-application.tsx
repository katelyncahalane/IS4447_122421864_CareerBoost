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
import FormField from '@/components/ui/form-field';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applicationStatusLogs, applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ApplicationFormErrors } from '@/lib/validate-application-form';
import { validateApplicationForm } from '@/lib/validate-application-form';
import { asc, eq } from 'drizzle-orm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

// types
type CategoryRow = { id: number; name: string; color: string; icon: string };

const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'] as const;
type Status = (typeof STATUSES)[number];

// screen
export default function EditApplicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number.parseInt(params.id ?? '', 10);

  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  // state
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [appliedDate, setAppliedDate] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('Applied');
  const [initialStatus, setInitialStatus] = useState<Status>('Applied');
  const [categoryId, setCategoryId] = useState<number | null>(null);

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
        const [catData, appData] = await Promise.all([
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
        const s = (STATUSES.includes(row.status as Status) ? (row.status as Status) : 'Applied') as Status;
        setStatus(s);
        setInitialStatus(s);
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
        await db.insert(applicationStatusLogs).values({
          applicationId: id,
          status,
          note: 'Status updated',
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
    Alert.alert('Delete application?', 'This will remove the application and its status history.', [
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
        <Stack.Screen options={{ title: 'Edit application' }} />
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  // render – main form + category modal
  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Edit application' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
          label="Applied date (YYYY-MM-DD)"
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
          label="Metric value"
          value={metricValue}
          onChangeText={(v) => {
            setMetricValue(v);
            setFieldErrors((e) => ({ ...e, metricValue: undefined }));
          }}
          placeholder="e.g. 1"
          keyboardType="numeric"
          autoCapitalize="none"
          errorText={fieldErrors.metricValue}
        />

        <View style={styles.fieldBlock}>
          <ThemedText type="defaultSemiBold">Category</ThemedText>
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
            accessibilityLabel="Save changes"
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
