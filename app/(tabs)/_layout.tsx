// tabs layout – bottom tab bar for main app section

// imports
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// screen – bottom tabs: applications, categories, targets, insights (rubric + charts).
export default function TabLayout() {
  const colorScheme = useColorScheme();

  const scheme = colorScheme ?? 'light';
  const tabPalette = Colors[scheme];

  // render
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabPalette.tint,
        tabBarInactiveTintColor: tabPalette.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: tabPalette.surfaceCard,
          borderTopColor: tabPalette.borderSubtle,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tracker',
          headerShown: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          headerShown: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="targets"
        options={{
          title: 'Targets',
          headerShown: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          headerShown: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.xyaxis.line" color={color} />,
        }}
      />
    </Tabs>
  );
}
