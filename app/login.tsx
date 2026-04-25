/**
 * References used for this screen (docs + source):
 * - Expo Router docs (file-based routing): https://docs.expo.dev/router/introduction/
 * - Expo Router GitHub (routing library): https://github.com/expo/router
 * - React Native TextInput: https://reactnative.dev/docs/textinput
 * - React Native Pressable: https://reactnative.dev/docs/pressable
 * - Expo docs (getting started / Expo Go workflow): https://docs.expo.dev/
 */
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Login
      </ThemedText>

      <ThemedText type="defaultSemiBold">Username</ThemedText>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. kate"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      <ThemedText type="defaultSemiBold">Password</ThemedText>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="password"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            // Next step: add real auth + navigation.
          }}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.tint, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText style={[styles.buttonLabel, { color: colorScheme === 'dark' ? '#111' : '#fff' }]}>
            Sign in
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  title: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actions: {
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
});

