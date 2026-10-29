import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, spacing } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

/** Entry gate: decides between login, biometric unlock and the app itself. */
export default function Index() {
  const { isBootstrapping, isAuthenticated, isLocked } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={styles.splash}>
        <Text style={styles.wordmark}>WATCH<Text style={styles.wordmarkAccent}>AI</Text></Text>
        <Text style={styles.tagline}>INDUSTRIAL SAFETY INTELLIGENCE</Text>
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      </View>
    );
  }

  if (isLocked) return <Redirect href="/biometric" />;
  if (isAuthenticated) return <Redirect href="/dashboard" />;
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  spinner: {
    marginTop: spacing.lg,
  },
});
