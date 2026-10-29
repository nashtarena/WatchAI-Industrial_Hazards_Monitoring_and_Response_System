import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Severity } from '../constants/incidentTypes';
import { colors, font, letterSpacing, radius, severityColors, spacing } from '../constants/theme';
import { formatConfidence } from '../lib/format';

interface ConfidenceBarProps {
  confidence: number;
  severity: Severity;
  showLabel?: boolean;
}

export function ConfidenceBar({ confidence, severity, showLabel = true }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(1, confidence));
  const color = severityColors[severity];

  return (
    <View style={styles.wrapper}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>CONFIDENCE</Text>
          <Text style={[styles.value, { color }]}>{formatConfidence(clamped)}</Text>
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: letterSpacing.wide,
  },
  value: {
    fontSize: font.label,
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
