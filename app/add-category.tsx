// add category – insert into `categories` (name, colour hex, icon label). Records on the tracker must pick a category.

// imports
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FormField from '@/components/ui/form-field';
import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { validateCategoryForm } from '@/lib/validate-category-form';
import { Stack, useRouter } from 'expo-router';

// constants – simple preset palette (good contrast on white cards)
const PRESET_COLOURS = ['#2563eb', '#16a34a', '#a855f7', '#dc2626', '#ea580c', '#0891b2'] as const;

// screen
export default function AddCategoryScreen() {
  const router = useRouter();
  const palette = useThemePalette();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PRESET_COLOURS[0]);
  const [icon, setIcon] = useState('tag');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; color?: string; icon?: string }>({});

  // true when the hex field matches one of the chips (hint text only)
  const selectedPreset = useMemo(() => PRESET_COLOURS.find((c) => c === color) ?? null, [color]);

  const onSave = async () => {
    const check = validateCategoryForm({ name, color, icon });
    if (!check.ok) {
      setFieldErrors(check.errors);
      return;
    }
    setFieldErrors({});
    const { name: n, color: col, icon: ic } = check.values;
    try {
      await db.insert(categories).values({
        name: n,
        color: col,
        icon: ic,
        createdAt: Date.now(),
      });
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  // render
  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Add category' }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.storyCard, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}>
          <ThemedText type="defaultSemiBold">What a category is</ThemedText>
          <ThemedText style={[styles.storyLead, { color: palette.icon }]}>
            Each category has a name, a colour for chips and list accents, and a short icon label (plain text for lists
            and CSV). Every tracker record must reference a category, add categories here first when you need a new
            group.
          </ThemedText>
        </View>

        <FormField
          label="Name"
          hint="Required. Shown wherever this category is listed (e.g. Software Engineering)."
          value={name}
          onChangeText={(v) => {
            setName(v);
            setFieldErrors((e) => ({ ...e, name: undefined }));
          }}
          placeholder="e.g. Software Engineering"
          autoCapitalize="words"
          errorText={fieldErrors.name}
        />

        <View style={styles.block}>
          <ThemedText type="defaultSemiBold">Colour</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.icon }]}>
            Required. Tap a swatch or type a full six-digit hex value, used on the tracker and category list.
          </ThemedText>
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Category colour">
            {PRESET_COLOURS.map((c) => {
              const on = c === color;
              return (
                <Pressable
                  key={c}
                  // radio group: one colour selected at a time (can still override in the hex field)
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
          {selectedPreset ? (
            <ThemedText style={styles.presetNote}>Using a preset swatch.</ThemedText>
          ) : null}
        </View>

        <FormField
          label="Icon label"
          hint="Required. One short word or token, not an image file, used in the category list and exports."
          value={icon}
          onChangeText={(v) => {
            setIcon(v);
            setFieldErrors((e) => ({ ...e, icon: undefined }));
          }}
          placeholder="e.g. code, chart, tag"
          autoCapitalize="none"
          errorText={fieldErrors.icon}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save new category"
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.primaryLabel}>Save</ThemedText>
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
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  storyCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  storyLead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  block: { gap: 8 },
  hint: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchOuter: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
  },
  swatchInner: { width: 36, height: 36, borderRadius: 18 },
  presetNote: { fontSize: 13, opacity: 0.75 },
  actions: { gap: 10, marginTop: 8 },
  primary: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#999',
  },
  secondaryLabel: { fontWeight: '600', fontSize: 16 },
});
