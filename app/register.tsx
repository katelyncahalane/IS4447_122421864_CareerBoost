// register screen – local-only session after basic password checks

// imports
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBanner } from '@/components/ui/hero-banner';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import { setSession } from '@/lib/session';
import { registerLocalUser } from '@/lib/auth';
import { seedDb } from '@/db/seed';

// screen
export default function RegisterScreen() {
  const palette = useThemePalette();
  const router = useRouter();

  // state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <HeroBanner eyebrow="CareerBoost" title="Create account" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.muted}>Create an account to use CareerBoost on this device.</ThemedText>

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
        <ThemedText style={[styles.pwHint, { color: palette.icon }]}>Minimum 6 characters.</ThemedText>
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
        secureTextEntry={!showPassword}
        accessibilityLabel="Confirm password"
        textContentType="newPassword"
        autoComplete="new-password"
        placeholder="repeat password"
        placeholderTextColor={palette.icon}
        style={[styles.input, { color: palette.text, borderColor: palette.icon }]}
      />

      {error ? (
        <View
          style={[
            styles.errorBanner,
            { borderColor: palette.errorBorder, backgroundColor: palette.errorSurface },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite">
          <ThemedText style={[styles.errorText, { color: palette.errorText }]}>{error}</ThemedText>
        </View>
      ) : null}

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
            void (async () => {
              try {
                const user = await registerLocalUser({ username, password });
                await setSession({ userId: user.id, username: user.username });
                // Populate demo data once per device/profile (idempotent).
                await seedDb();
                router.replace('/(tabs)');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not create account.');
              }
            })();
          }}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          accessibilityHint="Registers this username on this device when requirements are met"
          accessibilityState={{ disabled: !canSubmit }}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: palette.tint,
              opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText style={[styles.buttonLabel, { color: palette.onTint }]}>
            Create account
          </ThemedText>
        </Pressable>

        <Link href="/login" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={[styles.linkText, { color: palette.tint }]}>
              Back to login
            </ThemedText>
          </Pressable>
        </Link>
      </View>
      </ScrollView>
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollBody: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
    flexGrow: 1,
  },
  muted: {
    opacity: 0.8,
    marginBottom: 8,
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
  errorBanner: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
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
