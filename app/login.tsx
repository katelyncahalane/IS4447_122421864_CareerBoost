/**
 * References used for this screen (docs + source):
 * - Expo Router docs (file-based routing): https://docs.expo.dev/router/introduction/
 * - Expo Router GitHub (routing library): https://github.com/expo/router
 * - React Native TextInput: https://reactnative.dev/docs/textinput
 * - React Native Pressable: https://reactnative.dev/docs/pressable
 * - Expo docs (getting started / Expo Go workflow): https://docs.expo.dev/
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import { setSession } from '@/lib/session';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0;
  }, [password.length, username]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Login
      </ThemedText>

      <ThemedText type="defaultSemiBold">Username</ThemedText>
      <TextInput
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Username"
        textContentType="username"
        autoComplete="username"
        placeholder="e.g. kate"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      <ThemedText type="defaultSemiBold">Password</ThemedText>
      <TextInput
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        secureTextEntry
        accessibilityLabel="Password"
        textContentType="password"
        autoComplete="password"
        placeholder="password"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            // Next step: add real auth + navigation.
            if (!canSubmit) {
              setError('Enter your username and password.');
              return;
            }
            void setSession({ username: username.trim() }).then(() => {
              router.replace('/(tabs)');
            });
          }}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: palette.tint,
              opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText style={[styles.buttonLabel, { color: colorScheme === 'dark' ? '#111' : '#fff' }]}>
            Sign in
          </ThemedText>
        </Pressable>

        <Link href="/register" asChild>
          <Pressable style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={[styles.linkText, { color: palette.tint }]}>
              Create an account
            </ThemedText>
          </Pressable>
        </Link>
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
    gap: 12,
  },
  errorText: {
    color: '#c00',
    marginTop: 2,
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
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontWeight: '600',
    fontSize: 16,
  },
});

