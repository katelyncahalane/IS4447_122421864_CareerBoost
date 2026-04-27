// Read-only status history for one application (flexbox timeline; a11y summary on container)

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type StatusLogRow = {
  id: number;
  status: string;
  note: string | null;
  createdAt: number;
};

type Palette = {
  tint: string;
  text: string;
  icon: string;
  borderSubtle: string;
  surfaceMuted: string;
  surfaceCard: string;
};

type Props = {
  logs: StatusLogRow[];
  palette: Palette;
};

function formatWhen(ms: number): string {
  try {
    const d = new Date(ms);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

export function StatusTimeline({ logs, palette }: Props) {
  const ordered = [...logs].sort((a, b) => a.createdAt - b.createdAt);
  const summary =
    ordered.length === 0
      ? 'No status history yet.'
      : `Status history, ${ordered.length} entries, from ${ordered[0]?.status ?? ''} to ${ordered[ordered.length - 1]?.status ?? ''}.`;

  return (
    <View
      style={[styles.card, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceMuted }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={summary}>
      <ThemedText type="defaultSemiBold" style={styles.heading}>
        Status history
      </ThemedText>
      <ThemedText style={[styles.hint, { color: palette.icon }]}>
        Oldest at the top. Change status below and add an optional note when you save to append a new entry.
      </ThemedText>

      {ordered.length === 0 ? (
        <ThemedText style={[styles.empty, { color: palette.icon }]}>No entries yet.</ThemedText>
      ) : (
        <View style={styles.list}>
          {ordered.map((row, index) => {
            const isLast = index === ordered.length - 1;
            return (
              <View key={row.id} style={styles.row}>
                <View style={styles.trackCol}>
                  <View style={[styles.dot, { borderColor: palette.tint, backgroundColor: palette.surfaceCard }]} />
                  {!isLast ? <View style={[styles.line, { backgroundColor: palette.borderSubtle }]} /> : null}
                </View>
                <View style={styles.bodyCol}>
                  <View style={styles.titleRow}>
                    <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
                      {row.status}
                    </ThemedText>
                    <ThemedText style={[styles.when, { color: palette.icon }]}>{formatWhen(row.createdAt)}</ThemedText>
                  </View>
                  {row.note ? (
                    <ThemedText style={[styles.note, { color: palette.text }]}>{row.note}</ThemedText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  heading: { fontSize: 16 },
  hint: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  empty: { fontSize: 14, fontStyle: 'italic', paddingVertical: 4 },
  list: { flexDirection: 'column', gap: 0, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  trackCol: { width: 18, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 4,
  },
  line: { width: 2, flexGrow: 1, minHeight: 8, marginTop: 2 },
  bodyCol: { flex: 1, flexDirection: 'column', gap: 4, paddingBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  when: { fontSize: 12, fontWeight: '600' },
  note: { fontSize: 14, lineHeight: 20, opacity: 0.95 },
});
