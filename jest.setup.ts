// jest setup – extra matchers for react native testing library

// side effect – extend expect() once per test run
import '@testing-library/jest-native/extend-expect';

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
    setItem: jest.fn(async (key: string, value: string) => {
      asyncStorageStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete asyncStorageStore[key];
    }),
    mergeItem: jest.fn(async () => {}),
    clear: jest.fn(async () => {
      for (const k of Object.keys(asyncStorageStore)) delete asyncStorageStore[k];
    }),
    getAllKeys: jest.fn(async () => Object.keys(asyncStorageStore)),
    multiGet: jest.fn(async (keys: readonly string[]) =>
      keys.map((k) => [k, asyncStorageStore[k] ?? null]),
    ),
    multiSet: jest.fn(async (pairs: readonly [string, string][]) => {
      for (const [k, v] of pairs) asyncStorageStore[k] = v;
    }),
    multiRemove: jest.fn(async (keys: readonly string[]) => {
      for (const k of keys) delete asyncStorageStore[k];
    }),
  },
}));

// mock – expo-linear-gradient is native; render as a plain View in tests
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({
      children,
      colors: _c,
      start: _s,
      end: _e,
      ...rest
    }: {
      children?: React.ReactNode;
      colors?: unknown;
      start?: unknown;
      end?: unknown;
    }) => React.createElement(View, rest, children),
  };
});

// mock – HeroBanner uses insets; Jest has no native safe area unless wrapped
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { style: { flex: 1 } }, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// mock – react-native-svg is native; render as plain Views in Jest
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true, expires: 'never' })),
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (p: { children?: React.ReactNode }) => React.createElement(View, p);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
    Path: Stub,
    Polyline: Stub,
    Line: Stub,
    G: Stub,
  };
});
