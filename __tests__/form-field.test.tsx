// Component tests — reusable FormField: label, placeholder, optional hint, simulated input → onChangeText.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import FormField from '@/components/ui/form-field';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

// ThemedText → useThemeColor → useThemeControls; stub context so theme-preference (AsyncStorage) is not loaded.
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

jest.mock('@/hooks/use-theme-palette', () => {
  const { Colors } = jest.requireActual('@/constants/theme') as typeof import('@/constants/theme');
  return { useThemePalette: () => Colors.light };
});

describe('FormField (component)', () => {
  it('renders the provided label and placeholder, and fires onChangeText when input is simulated', () => {
    const onChangeText = jest.fn();

    const screen = render(
      <FormField
        label="Company"
        value=""
        onChangeText={onChangeText}
        placeholder="e.g. Northwind Retail"
      />,
    );

    expect(screen.getByText('Company')).toBeTruthy();
    const input = screen.getByPlaceholderText('e.g. Northwind Retail');
    expect(screen.getByLabelText('Company')).toBe(input);

    fireEvent.changeText(input, 'Acme Inc');
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith('Acme Inc');
  });

  it('renders optional hint text under the label', () => {
    const screen = render(
      <FormField
        label="Primary metric"
        hint="Enter a positive whole number."
        value=""
        onChangeText={jest.fn()}
        placeholder="30"
      />,
    );
    expect(screen.getByText('Enter a positive whole number.')).toBeTruthy();
    const input = screen.getByPlaceholderText('30');
    expect(
      screen.getByLabelText('Primary metric. Enter a positive whole number.'),
    ).toBe(input);
  });

  it('shows error text when errorText is set', () => {
    const screen = render(
      <FormField label="Company" value="" onChangeText={jest.fn()} errorText="Too short." />,
    );
    expect(screen.getByText('Too short.')).toBeTruthy();
    const input = screen.getByLabelText('Company');
    expect(input.props.accessibilityState?.invalid).toBe(true);
    expect(input.props.accessibilityHint).toBe('Too short.');
  });
});
