import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';

export type BannerTone = 'info' | 'warning' | 'critical' | 'success' | 'demo';

const TONES: Record<BannerTone, { color: string; label: string }> = {
  info: { color: colors.accent, label: 'INFO' },
  warning: { color: colors.medium, label: 'ATTENTION' },
  critical: { color: colors.critical, label: 'ALERT' },
  success: { color: colors.success, label: 'OK' },
  demo: { color: colors.demo, label: 'DEMO' },
};

interface BannerProps {
  tone: BannerTone;
  message: string;
  title?: string;
}

export function Banner({ tone, message, title }: BannerProps) {
  const { color, label } = TONES[tone];
  return (
    <View style={[styles.wrapper, { borderColor: color, backgroundColor: `${color}14` }]}>
      <Text style={[styles.label, { color }]}>{(title ?? label).toUpperCase()}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  label: {
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  message: {
    color: colors.text,
    fontSize: font.label,
    lineHeight: 20,
  },
});
