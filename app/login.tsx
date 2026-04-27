// login screen – local-only session (replace later with sqlite users if needed)

// imports
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loginLocalUser } from '@/lib/auth';
import { setSession } from '@/lib/session';
import { Link, useRouter } from 'expo-router';

// screen
export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  // state – simple form fields + inline error text
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // derived – disable sign-in until both fields non-empty
  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0;
  }, [password.length, username]);

  // render
  return (
    <ThemedView style={styles.container}>
      <HeroBanner colorScheme={colorScheme} eyebrow="CareerBoost" title="Sign in" />

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
      <View style={styles.pwRow}>
        <ThemedText style={[styles.pwHint, { color: palette.icon }]}>
          Use the password you registered on this device.
        </ThemedText>
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          style={({ pressed }) => [styles.pwToggle, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText style={[styles.pwToggleText, { color: palette.tint }]}>
            {showPassword ? 'Hide' : 'Show'}
          </ThemedText>
        </Pressable>
      </View>
      <TextInput
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        secureTextEntry={!showPassword}
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
            if (!canSubmit) {
              setError('Enter your username and password.');
              return;
            }
            void (async () => {
              try {
                const user = await loginLocalUser({ username, password });
                await setSession({ userId: user.id, username: user.username });
                router.replace('/(tabs)');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not sign in.');
              }
            })();
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

// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pwHint: { flex: 1, fontSize: 13, fontWeight: '500', opacity: 0.9 },
  pwToggle: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  pwToggleText: { fontSize: 14, fontWeight: '800' },
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
