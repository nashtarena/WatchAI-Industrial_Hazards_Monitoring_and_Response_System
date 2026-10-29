import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Banner';
import { DEMO_ACCOUNTS } from '../../constants/demoData';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../constants/roles';
import { colors, font, letterSpacing, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isSigningIn, signInError, isAuthenticated, isLocked, lastEmail, biometricEnabled } =
    useAuth();

  const [email, setEmail] = useState(lastEmail || DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState('');

  if (isLocked) return <Redirect href="/biometric" />;
  if (isAuthenticated) return <Redirect href="/dashboard" />;

  const handleLogin = async () => {
    const success = await signIn(email, password);
    if (success) {
      // Offer biometric enrolment right after a successful demo login.
      router.replace(biometricEnabled ? '/dashboard' : '/biometric');
    }
  };

  const applyDemoAccount = (accountEmail: string, accountPassword: string) => {
    setEmail(accountEmail);
    setPassword(accountPassword);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Text style={styles.wordmark}>
            WATCH<Text style={styles.wordmarkAccent}>AI</Text>
          </Text>
          <Text style={styles.tagline}>INDUSTRIAL SAFETY INTELLIGENCE</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Operator sign in</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="operator@watchai.demo"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              editable={!isSigningIn}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              editable={!isSigningIn}
              onSubmitEditing={() => void handleLogin()}
            />
          </View>

          {signInError ? <Banner tone="critical" title="Sign-in failed" message={signInError} /> : null}

          <AppButton
            label="Login"
            loading={isSigningIn}
            loadingLabel="Signing in..."
            disabled={email.trim().length === 0 || password.length === 0}
            onPress={() => void handleLogin()}
          />
        </View>

        <View style={styles.demoBlock}>
          <Text style={styles.demoHeading}>DEMO ACCOUNTS</Text>
          <Text style={styles.demoNote}>
            Frontend demo authentication — no backend, no user database. A role belongs to the
            credential, so it cannot be chosen after signing in.
          </Text>

          {DEMO_ACCOUNTS.map((account) => (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              onPress={() => applyDemoAccount(account.email, account.password)}
              style={({ pressed }) => [styles.demoRow, pressed ? styles.demoRowPressed : null]}
              disabled={isSigningIn}
            >
              <View style={styles.demoRowText}>
                <Text style={styles.demoRole}>{ROLE_LABELS[account.role].toUpperCase()}</Text>
                <Text style={styles.demoEmail}>{account.email}</Text>
                <Text style={styles.demoDescription}>{ROLE_DESCRIPTIONS[account.role]}</Text>
              </View>
              <Text style={styles.demoFill}>USE</Text>
            </Pressable>
          ))}

          <Text style={styles.demoPassword}>Password for every demo account: watchai123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  wordmark: {
    color: colors.text,
    fontSize: font.display,
    fontWeight: '900',
    letterSpacing: letterSpacing.wider,
  },
  wordmarkAccent: {
    color: colors.accent,
  },
  tagline: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: letterSpacing.wider,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: '800',
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  demoBlock: {
    gap: spacing.sm,
  },
  demoHeading: {
    color: colors.accent,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  demoNote: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
  },
  demoRowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  demoRowText: {
    flex: 1,
    gap: 2,
  },
  demoRole: {
    color: colors.text,
    fontSize: font.label,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  demoEmail: {
    color: colors.accent,
    fontSize: font.label,
  },
  demoDescription: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
  },
  demoFill: {
    color: colors.textMuted,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  demoPassword: {
    color: colors.textDim,
    fontSize: font.micro,
    marginTop: spacing.xs,
  },
});
