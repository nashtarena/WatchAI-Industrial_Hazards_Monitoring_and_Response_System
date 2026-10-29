import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, spacing } from '../constants/theme';

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
  stacked?: boolean;
}

export function InfoRow({ label, value, valueColor, stacked = false }: InfoRowProps) {
  return (
    <View style={[styles.row, stacked ? styles.stacked : null]}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text
        style={[styles.value, stacked ? styles.stackedValue : null, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stacked: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
    paddingTop: 2,
  },
  value: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  stackedValue: {
    textAlign: 'left',
    fontWeight: '500',
    lineHeight: 21,
  },
});
