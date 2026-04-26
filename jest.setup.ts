// jest setup – extra matchers for react native testing library

// side effect – extend expect() once per test run
import '@testing-library/jest-native/extend-expect';

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
