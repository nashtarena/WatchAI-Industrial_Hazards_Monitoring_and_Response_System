import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Severity } from '../constants/incidentTypes';
import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';
import { severityColors } from '../constants/theme';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
}

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const color = severityColors[severity];
  return (
    <View style={[styles.badge, size === 'lg' ? styles.badgeLarge : null, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          size === 'md' ? styles.textMedium : null,
          size === 'lg' ? styles.textLarge : null,
          { color },
        ]}
      >
        {severity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.surfaceAlt,
  },
  badgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  textMedium: {
    fontSize: font.label,
  },
  textLarge: {
    fontSize: font.heading,
    letterSpacing: letterSpacing.wider,
  },
});
