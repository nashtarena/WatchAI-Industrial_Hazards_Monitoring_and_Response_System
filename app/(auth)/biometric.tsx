import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Banner';
import { colors, font, letterSpacing, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';

/**
 * Two jobs, one screen:
 *  - after a fresh login, offer to turn biometric unlock on
 *  - on a later launch with a stored session, require the unlock before the app opens
 *
 * Every failure path falls back to normal demo login. The user is never locked out.
 */
export default function BiometricScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLocked, biometricEnabled, fallbackToLogin } = useAuth();
  const { capabilities, isChecking, status, enable, unlock } = useBiometrics();
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const autoPrompted = useRef(false);

  const mode: 'UNLOCK' | 'ENROL' = isLocked ? 'UNLOCK' : 'ENROL';

  useEffect(() => {
    if (mode !== 'UNLOCK' || autoPrompted.current || !capabilities?.available) return;
    autoPrompted.current = true;
    void unlock();
  }, [mode, capabilities?.available, unlock]);

  if (!user) return <Redirect href="/login" />;
  if (mode === 'ENROL' && (biometricEnabled || dismissedPrompt)) return <Redirect href="/dashboard" />;

  const available = capabilities?.available ?? false;
  const methodLabel = capabilities?.methodLabel ?? 'Device biometrics';

  const handleEnable = async () => {
    const result = await enable();
    if (result.success) {
      router.replace('/dashboard');
    }
  };

  const handleUnlock = async () => {
    await unlock();
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.lockBadge}>
        <Text style={styles.lockGlyph}>{mode === 'UNLOCK' ? '⬤' : '◈'}</Text>
      </View>

      <Text style={styles.title}>
        {mode === 'UNLOCK' ? 'Unlock WatchAI' : 'Enable biometric unlock'}
      </Text>
      <Text style={styles.subtitle}>
        {mode === 'UNLOCK'
          ? `Confirm your identity with ${methodLabel} to open the safety console.`
          : `Use ${methodLabel} to unlock WatchAI on this device. Verification is performed by the operating system — WatchAI never stores biometric data.`}
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>SIGNED IN AS</Text>
        <Text style={styles.infoValue}>{user.name}</Text>
        <Text style={styles.infoMuted}>{user.email}</Text>
      </View>

      {!available && capabilities?.unavailableReason ? (
        <Banner tone="warning" title="Biometrics unavailable" message={capabilities.unavailableReason} />
      ) : null}

      {status ? <Banner tone={isChecking ? 'info' : 'warning'} message={status} /> : null}

      <View style={styles.actions}>
        {mode === 'UNLOCK' ? (
          <>
            <AppButton
              label={`Unlock with ${methodLabel}`}
              loading={isChecking}
              loadingLabel="Checking biometrics..."
              disabled={!available}
              onPress={() => void handleUnlock()}
            />
            <AppButton
              label="Use password instead"
              variant="ghost"
              onPress={() => void fallbackToLogin()}
              helperText="Biometric failure never locks you out of the demo."
            />
          </>
        ) : (
          <>
            <AppButton
              label={`Enable ${methodLabel}`}
              loading={isChecking}
              loadingLabel="Checking biometrics..."
              disabled={!available}
              onPress={() => void handleEnable()}
            />
            <AppButton
              label={available ? 'Skip for now' : 'Continue without biometrics'}
              variant="ghost"
              onPress={() => {
                setDismissedPrompt(true);
                router.replace('/dashboard');
              }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  lockBadge: {
    alignSelf: 'center',
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockGlyph: {
    color: colors.accent,
    fontSize: 28,
  },
  title: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 21,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
    marginTop: spacing.sm,
  },
  infoLabel: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  infoValue: {
    color: colors.text,
    fontSize: font.heading,
    fontWeight: '700',
  },
  infoMuted: {
    color: colors.textMuted,
    fontSize: font.label,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
