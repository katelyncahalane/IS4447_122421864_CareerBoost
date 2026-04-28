// Integration test (rubric item 10): Tracker applications list, data flows from mocked DB query through state to UI
// (same idea as habits/trips list screens: seeded rows must appear as list cells after init).

// mocks – must sit above the screen import (jest hoists these anyway)
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/contexts/app-color-scheme', () => ({
  useThemeControls: () => ({
    followsSystem: true,
    highContrast: false,
    toggleColorScheme: jest.fn(),
    toggleHighContrast: jest.fn(),
    resetToSystemTheme: jest.fn(async () => {}),
    resetHighContrastPreference: jest.fn(async () => {}),
  }),
}));

// mock – run focus effect like a normal useeffect so refresh() actually runs
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/lib/session', () => ({
  clearSession: jest.fn(async () => {}),
}));

// mock – drizzle await uses the query as a thenable; return a real promise of rows
const MOCK_ROWS = [
  {
    id: 1,
    company: 'Riverbank Analytics',
    role: 'Graduate Software Engineer',
    status: 'Interview',
    appliedDate: '2026-04-22',
    metricValue: 3,
    categoryName: 'Software Engineering',
    categoryColor: '#2563eb',
  },
];

jest.mock('@/db/client', () => {
  const schema = jest.requireActual('@/db/schema') as typeof import('@/db/schema');
  const { applications, categories } = schema;

  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          if (table === categories) {
            return {
              orderBy: () => Promise.resolve([{ id: 1, name: 'Software Engineering' }]),
            };
          }
          if (table === applications) {
            const joinChain = {
              where: () => ({
                orderBy: () => Promise.resolve(MOCK_ROWS),
              }),
              orderBy: () => Promise.resolve(MOCK_ROWS),
            };
            return { innerJoin: () => joinChain };
          }
          throw new Error(`Unexpected from() table in mock: ${String(table)}`);
        },
      }),
    },
  };
});

// imports – screen after mocks so it picks up the fake db
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import JobApplicationScreen from '@/app/(tabs)/index';

describe('Applications list (integration)', () => {
  it(
    'displays seeded-style application data from DB state through the list UI',
    async () => {
      render(<JobApplicationScreen />);

      expect(await screen.findByText('Riverbank Analytics', {}, { timeout: 15000 })).toBeTruthy();
      expect(screen.getByText('Graduate Software Engineer')).toBeTruthy();
      expect(screen.getByText(/2026-04-22/)).toBeTruthy();
      expect(screen.getByText(/primary metric 3/)).toBeTruthy();
      // Category name is rendered on the filter chip and on each card — expect at least one visible match.
      expect(screen.getAllByText(/Software Engineering/).length).toBeGreaterThanOrEqual(1);
      // Status appears on filter chips and on the card — at least one match confirms DB → UI flow.
      expect(screen.getAllByText(/Interview/).length).toBeGreaterThanOrEqual(1);
    },
    25_000,
  );
});
