// simple line chart – trend of the same period buckets as the bar chart

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import type { InsightBucket } from '@/lib/insights-aggregates';

type SimpleLineChartProps = {
  buckets: InsightBucket[];
  width: number;
  height?: number;
  stroke: string;
  gridColor: string;
  dotFill: string;
  textColor: string;
  mutedColor: string;
  /** e.g. “calendar day”, “week”, “calendar month” */
  bucketUnitPhrase: string;
  accessibilitySummary: string;
};

export function SimpleLineChart({
  buckets,
  width,
  height = 150,
  stroke,
  gridColor,
  dotFill,
  textColor,
  mutedColor,
  bucketUnitPhrase,
  accessibilitySummary,
}: SimpleLineChartProps) {
  const { points, maxC, innerW, innerH, padL, padT } = useMemo(() => {
    const padL = 36;
    const padR = 8;
    const padT = 12;
    const padB = 22;
    const innerW = Math.max(1, width - padL - padR);
    const innerH = Math.max(1, height - padT - padB);
    const maxC = buckets.reduce((m, b) => Math.max(m, b.count), 0);
    const yLabelMax = Math.max(maxC, 1);
    const n = Math.max(buckets.length, 1);
    const pts = buckets.map((b, i) => {
      const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const yNorm = maxC === 0 ? 1 : b.count / yLabelMax;
      const y = padT + innerH * (1 - yNorm);
      return { x, y, count: b.count, label: b.label };
    });
    return { points: pts, maxC, innerW, innerH, padL, padT };
  }, [buckets, width, height]);

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  if (buckets.length === 0) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel="Line chart. No buckets.">
        <ThemedText style={{ color: mutedColor }}>No timeline data.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilitySummary}
        style={{ width }}>
        <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no">
          <Line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={gridColor} strokeWidth={1} />
          <Line
            x1={padL}
            y1={padT + innerH}
            x2={padL + innerW}
            y2={padT + innerH}
            stroke={gridColor}
            strokeWidth={1}
          />
          <Line
            x1={padL}
            y1={padT}
            x2={padL + innerW}
            y2={padT}
            stroke={gridColor}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
          <Polyline
            points={polyPoints}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={p.count > 0 ? 5 : 3} fill={p.count > 0 ? dotFill : gridColor} />
          ))}
        </Svg>
      </View>
      <ThemedText style={[styles.yCap, { color: mutedColor }]}>Peak in view: {maxC}</ThemedText>
      <ThemedText style={[styles.caption, { color: textColor }]}>
        Each point is one {bucketUnitPhrase} in the timeline, from your stored application dates.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 6 },
  yCap: { fontSize: 12, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, opacity: 0.9 },
});
