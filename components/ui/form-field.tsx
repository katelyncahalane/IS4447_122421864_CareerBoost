// form field – reusable label + text input (used on add / edit screens)
//
// References — controlled inputs & accessibility:
// - React: reacting to input with state: https://react.dev/learn/reacting-to-input-with-state
// - React Native TextInput: https://reactnative.dev/docs/textinput
// - Labels / screen readers: https://reactnative.dev/docs/accessibility#accessibilitylabel
// - React Testing Library Native (testing forms): https://callstack.github.io/react-native-testing-library/docs/api#fireevent
// - Book (forms in React): https://www.oreilly.com/library/view/learning-react-2nd/9781491966981/

// imports
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemePalette } from '@/hooks/use-theme-palette';

// types – props for a single labelled input
type Props = {
  label: string;
  /** Short guidance under the label (not the error line). */
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  multiline?: boolean;
  errorText?: string;
};

// component
export default function FormField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  multiline = false,
  errorText,
}: Props) {
  const palette = useThemePalette();
  const hasError = Boolean(errorText);
  const inputAccessibilityLabel = hint ? `${label}. ${hint}` : label;

  // render – stack label above bordered input
  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" accessible={false}>
        {label}
      </ThemedText>
      {hint ? (
        <ThemedText style={[styles.hint, { color: palette.icon }]} accessible={false}>
          {hint}
        </ThemedText>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.icon}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        accessibilityLabel={inputAccessibilityLabel}
        accessibilityHint={hasError ? errorText : undefined}
        accessibilityState={{ invalid: hasError }}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          { color: palette.text, borderColor: hasError ? '#c00' : palette.icon },
        ]}
      />
      {errorText ? <ThemedText style={styles.error}>{errorText}</ThemedText> : null}
    </View>
  );
}

// styles
const styles = StyleSheet.create({
  container: { gap: 6 },
  hint: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  error: { color: '#c00', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
