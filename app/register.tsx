// register screen – local-only session after basic password checks

// imports
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import { setSession } from '@/lib/session';

// screen
export default function RegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  // state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // derived – simple rules: username + matching passwords length 6+
  const canSubmit = useMemo(() => {
    return (
      username.trim().length > 0 &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword
    );
  }, [confirmPassword, password, username]);

  // render
  return (
    <ThemedView style={styles.container}>
      <HeroBanner colorScheme={colorScheme} eyebrow="CareerBoost" title="Create account" />

      <ThemedText style={styles.muted}>
        Create an account for this device (local-only).
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
        textContentType="newPassword"
        autoComplete="new-password"
        placeholder="min 6 characters"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      <ThemedText type="defaultSemiBold">Confirm password</ThemedText>
      <TextInput
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          if (error) setError(null);
        }}
        secureTextEntry
        accessibilityLabel="Confirm password"
        textContentType="newPassword"
        autoComplete="new-password"
        placeholder="repeat password"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            if (!username.trim()) {
              setError('Enter a username.');
              return;
            }
            if (password.length < 6) {
              setError('Password must be at least 6 characters.');
              return;
            }
            if (password !== confirmPassword) {
              setError('Passwords do not match.');
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
            Create account
          </ThemedText>
        </Pressable>

        <Link href="/login" asChild>
          <Pressable style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={[styles.linkText, { color: palette.tint }]}>
              Back to login
            </ThemedText>
          </Pressable>
        </Link>
      </View>
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  muted: {
    opacity: 0.8,
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
