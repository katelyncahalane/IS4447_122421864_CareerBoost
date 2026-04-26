// component test – formfield shows label / placeholder and calls onchangetext

// imports
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import FormField from '@/components/ui/form-field';

// mock – pin colour scheme so output is stable in tests
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

// tests
describe('FormField', () => {
  it('renders label + placeholder and fires onChangeText', () => {
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

    fireEvent.changeText(input, 'Acme Inc');
    expect(onChangeText).toHaveBeenCalledWith('Acme Inc');
  });

  it('shows error text when errorText is set', () => {
    const screen = render(
      <FormField label="Company" value="" onChangeText={jest.fn()} errorText="Too short." />,
    );
    expect(screen.getByText('Too short.')).toBeTruthy();
  });
});
