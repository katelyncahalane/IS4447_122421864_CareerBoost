// edit category – update row in `categories`; delete blocked if any `applications` still reference this category (foreign key safety).

// imports
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FormField from '@/components/ui/form-field';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { count, eq } from 'drizzle-orm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

// constants
const PRESET_COLOURS = ['#2563eb', '#16a34a', '#a855f7', '#dc2626', '#ea580c', '#0891b2'] as const;

// helpers
function isHexColour(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v.trim());
}

// screen
export default function EditCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number.parseInt(params.id ?? '', 10);

  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

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
    const n = name.trim();
    const ic = icon.trim();
    const col = color.trim();
    const next: typeof fieldErrors = {};
    if (!n) next.name = 'Name is required.';
    if (!ic) next.icon = 'Short icon label is required.';
    if (!isHexColour(col)) next.color = 'Use hex format like #2563eb.';
    if (Object.keys(next).length) {
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
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

  // delete – confirm first; refuse if applications.category_id points here (would break FKs)
  const onDelete = () => {
    Alert.alert('Delete category?', 'You cannot undo this.', [
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
                `This category is used by ${used} application(s). Reassign or delete those first.`,
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
        <FormField
          label="Name"
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
          <ThemedText style={styles.hint}>Tap a swatch or type a hex value.</ThemedText>
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
          label="Icon label"
          value={icon}
          onChangeText={(v) => {
            setIcon(v);
            setFieldErrors((e) => ({ ...e, icon: undefined }));
          }}
          placeholder="e.g. code, chart"
          autoCapitalize="none"
          errorText={fieldErrors.icon}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save changes"
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.primaryLabel}>Save</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete category"
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
  block: { gap: 8 },
  hint: { opacity: 0.8, fontSize: 14 },
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
