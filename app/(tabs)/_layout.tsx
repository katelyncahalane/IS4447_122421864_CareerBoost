// tabs layout – bottom tab bar for main app section

// imports
import { Tabs } from 'expo-router';
import React from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemePalette } from '@/hooks/use-theme-palette';

// screen – bottom tabs: applications, categories, targets, insights (rubric + charts).
export default function TabLayout() {
  const tabPalette = useThemePalette();

  // render
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabPalette.tint,
        tabBarInactiveTintColor: tabPalette.tabIconDefault,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: tabPalette.surfaceCard,
          borderTopColor: tabPalette.borderSubtle,
          borderTopWidth: 1,
          zIndex: 1000,
          elevation: 1000,
        },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tracker',
          headerShown: true,
          tabBarAccessibilityLabel: 'Tracker tab. Job applications list and filters.',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          headerShown: true,
          tabBarAccessibilityLabel: 'Categories tab. Create and edit application categories.',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="targets"
        options={{
          title: 'Targets',
          headerShown: true,
          tabBarAccessibilityLabel: 'Targets tab. Weekly and monthly application goals.',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          headerShown: true,
          tabBarAccessibilityLabel: 'Insights tab. Charts from your saved applications.',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.xyaxis.line" color={color} />,
        }}
      />
    </Tabs>
  );
}
