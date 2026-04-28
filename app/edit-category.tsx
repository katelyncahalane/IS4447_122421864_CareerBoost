// edit category – update `categories` (name, colour, emoji). Delete only when no records reference this category (FK).

// imports
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FormField from '@/components/ui/form-field';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { validateCategoryForm } from '@/lib/validate-category-form';
import { count, eq } from 'drizzle-orm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

// constants
const PRESET_COLOURS = [
  '#2563eb',
  '#16a34a',
  '#a855f7',
  '#dc2626',
  '#ea580c',
  '#0891b2',
  '#0f766e',
  '#4f46e5',
  '#9333ea',
  '#c026d3',
  '#db2777',
  '#b45309',
  '#64748b',
  '#0ea5e9',
] as const;

// screen
export default function EditCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number.parseInt(params.id ?? '', 10);

  const colorScheme = useColorScheme() ?? 'light';
  const palette = useThemePalette();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [icon, setIcon] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; color?: string; icon?: string }>({});

  const selectedPreset = useMemo(() => PRESET_COLOURS.find((c) => c === color) ?? null, [color]);

  // effect – load row
  useEffect(() => {
    if (!Number.isFinite(id)) {
      Alert.alert('Invalid link', 'Missing category id.');
      router.back();
      return;
    }
    let mounted = true;
    void (async () => {
      setLoading(true);
      try {
        const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
        const row = rows[0];
        if (!mounted) return;
        if (!row) {
          Alert.alert('Not found', 'This category no longer exists.');
          router.back();
          return;
        }
        setName(row.name);
        setColor(row.color);
        setIcon(row.icon);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, router]);

  // handler – save updates
  const onSave = async () => {
    const check = validateCategoryForm({ name, color, icon });
    if (!check.ok) {
      setFieldErrors(check.errors);
      return;
    }
    setFieldErrors({});
    const { name: n, color: col, icon: ic } = check.values;
    try {
      await db
        .update(categories)
        .set({ name: n, color: col, icon: ic })
        .where(eq(categories.id, id));
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  // delete – confirm first; refuse if any application row still references this category (FK + rubric)
  const onDelete = () => {
    Alert.alert(
      'Delete this category?',
      'You can only remove a category when no saved records point to it. Every record must keep a category reference.',
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const used =
              (await db.select({ c: count() }).from(applications).where(eq(applications.categoryId, id)))[0]?.c ??
              0;
            if (used > 0) {
              Alert.alert(
                'Cannot delete',
                `This category is still referenced by ${used} saved record${used === 1 ? '' : 's'}. Edit each record to pick another category (or delete the record), then try again.`,
              );
              return;
            }
            await db.delete(categories).where(eq(categories.id, id));
            router.back();
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Edit category' }} />
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Edit category' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.storyCard, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}>
          <ThemedText type="defaultSemiBold">Editing categories</ThemedText>
          <ThemedText style={[styles.storyLead, { color: palette.icon }]}>
            Name, colour, and emoji are saved on this device and show on every record that uses this category. You cannot
            delete a category while any record still uses it, reassign records on the tracker first.
          </ThemedText>
        </View>

        <FormField
          label="Name"
          hint="Required. Updates everywhere this category appears."
          value={name}
          onChangeText={(v) => {
            setName(v);
            setFieldErrors((e) => ({ ...e, name: undefined }));
          }}
          placeholder="Category name"
          autoCapitalize="words"
          errorText={fieldErrors.name}
        />

        <View style={styles.block}>
          <ThemedText type="defaultSemiBold">Colour</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.icon }]}>
            Required. Swatch or six-digit hex, updates list accents and tracker chips for linked records.
          </ThemedText>
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Category colour">
            {PRESET_COLOURS.map((c) => {
              const on = c === color;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Colour ${c}`}
                  onPress={() => {
                    setColor(c);
                    setFieldErrors((e) => ({ ...e, color: undefined }));
                  }}
                  style={({ pressed }) => [
                    styles.swatchOuter,
                    { borderColor: on ? palette.tint : 'transparent', opacity: pressed ? 0.8 : 1 },
                  ]}>
                  <View style={[styles.swatchInner, { backgroundColor: c }]} />
                </Pressable>
              );
            })}
          </View>
          <FormField
            label="Hex colour (#RRGGBB)"
            hint="Must be exactly six hex digits after #."
            value={color}
            onChangeText={(v) => {
              setColor(v);
              setFieldErrors((e) => ({ ...e, color: undefined }));
            }}
            placeholder="#2563eb"
            autoCapitalize="characters"
            errorText={fieldErrors.color}
          />
          {selectedPreset ? <ThemedText style={styles.presetNote}>Matches a preset swatch.</ThemedText> : null}
        </View>

        <FormField
          label="Emoji"
          hint="Required. A simple emoji used in lists and exports."
          value={icon}
          onChangeText={(v) => {
            setIcon(v);
            setFieldErrors((e) => ({ ...e, icon: undefined }));
          }}
          placeholder="e.g. 💻 📊 🎨"
          autoCapitalize="none"
          errorText={fieldErrors.icon}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save category changes"
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.primaryLabel}>Save</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete category if unused"
            onPress={onDelete}
            style={({ pressed }) => [styles.danger, { opacity: pressed ? 0.85 : 1 }]}>
            <ThemedText style={styles.dangerLabel}>Delete</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.75 : 1 }]}>
            <ThemedText style={styles.secondaryLabel}>Cancel</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.85 },
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  storyCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  storyLead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  block: { gap: 8 },
  hint: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchOuter: { padding: 3, borderRadius: 999, borderWidth: 2 },
  swatchInner: { width: 36, height: 36, borderRadius: 18 },
  presetNote: { fontSize: 13, opacity: 0.75 },
  actions: { gap: 10, marginTop: 8 },
  primary: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  danger: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c00',
  },
  dangerLabel: { color: '#c00', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#999',
  },
  secondaryLabel: { fontWeight: '600', fontSize: 16 },
});
