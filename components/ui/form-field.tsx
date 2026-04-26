// form field – reusable label + text input (used on add / edit screens)

// imports
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// types – props for a single labelled input
type Props = {
  label: string;
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
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  multiline = false,
  errorText,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const hasError = Boolean(errorText);

  // render – stack label above bordered input
  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.icon}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={hasError ? errorText : undefined}
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
