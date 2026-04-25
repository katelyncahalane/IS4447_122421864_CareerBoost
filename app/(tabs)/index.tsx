import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteJobApplication,
  loadJobApplication,
  type JobApplication,
  saveJobApplication,
} from '@/lib/job-application-storage';

const emptyForm = (): JobApplication => ({
  company: '',
  role: '',
  status: '',
  notes: '',
});

export default function JobApplicationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<JobApplication>(emptyForm());
  const [hasRecord, setHasRecord] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const app = await loadJobApplication();
      if (app) {
        setForm(app);
        setHasRecord(true);
      } else {
        setForm(emptyForm());
        setHasRecord(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSave = async () => {
    if (!form.company.trim() || !form.role.trim()) {
      Alert.alert('Missing fields', 'Please enter at least company and role.');
      return;
    }
    setSaving(true);
    try {
      await saveJobApplication({
        company: form.company.trim(),
        role: form.role.trim(),
        status: form.status.trim(),
        notes: form.notes.trim(),
      });
      setHasRecord(true);
      Alert.alert('Saved', 'Your job application was updated.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete application?', 'This clears your saved application.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteJobApplication();
          setForm(emptyForm());
          setHasRecord(false);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <ThemedView style={styles.body}>
          {!hasRecord ? (
            <ThemedText style={styles.muted}>
              No application saved. Enter details below and tap Save to add one.
            </ThemedText>
          ) : null}

          <ThemedText type="defaultSemiBold">Company</ThemedText>
          <TextInput
            value={form.company}
            onChangeText={(company) => setForm((f) => ({ ...f, company }))}
            placeholder="Company name"
            placeholderTextColor={palette.icon}
            style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
          />

          <ThemedText type="defaultSemiBold">Role</ThemedText>
          <TextInput
            value={form.role}
            onChangeText={(role) => setForm((f) => ({ ...f, role }))}
            placeholder="Job title"
            placeholderTextColor={palette.icon}
            style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
          />

          <ThemedText type="defaultSemiBold">Status</ThemedText>
          <TextInput
            value={form.status}
            onChangeText={(status) => setForm((f) => ({ ...f, status }))}
            placeholder="e.g. Applied, Interview"
            placeholderTextColor={palette.icon}
            style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
          />

          <ThemedText type="defaultSemiBold">Notes</ThemedText>
          <TextInput
            value={form.notes}
            onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
            placeholder="Optional notes"
            placeholderTextColor={palette.icon}
            multiline
            style={[
              styles.input,
              styles.notes,
              { color: palette.text, borderColor: palette.icon },
            ]}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={() => void onSave()}
              disabled={saving}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: palette.tint, opacity: pressed || saving ? 0.85 : 1 },
              ]}>
              {saving ? (
                <ActivityIndicator color={colorScheme === 'dark' ? '#111' : '#fff'} />
              ) : (
                <ThemedText
                  style={[styles.buttonLabel, { color: colorScheme === 'dark' ? '#111' : '#fff' }]}>
                  Save
                </ThemedText>
              )}
            </Pressable>

            {hasRecord ? (
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => [
                  styles.button,
                  styles.deleteButton,
                  { borderColor: '#c00', opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText style={styles.deleteLabel}>Delete</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  scroll: { flexGrow: 1 },
  body: { padding: 16, gap: 8 },
  muted: { opacity: 0.8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  notes: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontWeight: '600', fontSize: 16 },
  deleteButton: { backgroundColor: 'transparent', borderWidth: 1 },
  deleteLabel: { color: '#c00', fontWeight: '600', fontSize: 16 },
});
