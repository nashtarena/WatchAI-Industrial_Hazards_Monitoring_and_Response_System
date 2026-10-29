import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: number;
  accent?: string;
  emphasis?: boolean;
}

export function StatCard({ label, value, accent = colors.accent, emphasis = false }: StatCardProps) {
  return (
    <View style={[styles.card, emphasis ? { borderColor: accent } : null]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <Text style={[styles.value, emphasis ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  value: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  label: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: letterSpacing.wide,
    marginTop: 2,
  },
});
