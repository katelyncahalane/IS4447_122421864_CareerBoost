// integration test – applications list shows a seeded row (db mocked)

// mocks – must sit above the screen import (jest hoists these anyway)
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
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
  },
];

jest.mock('@/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          orderBy: () => Promise.resolve(MOCK_ROWS),
        }),
      }),
    }),
  },
}));

// imports – screen after mocks so it picks up the fake db
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import JobApplicationScreen from '@/app/(tabs)/index';

// tests
describe('Applications list integration', () => {
  it('renders seeded application rows', async () => {
    render(<JobApplicationScreen />);

    // findbytext waits like waitfor but tends to be more stable in rn tests
    expect(await screen.findByText('Riverbank Analytics', {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText('Graduate Software Engineer')).toBeTruthy();
    expect(screen.getByText(/2026-04-22/)).toBeTruthy();
  });
});
