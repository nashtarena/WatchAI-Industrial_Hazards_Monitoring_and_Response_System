import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { INCIDENT_STATUS_LABELS, IncidentStatus } from '../constants/incidentTypes';
import { colors, font, letterSpacing, radius, spacing, statusColors } from '../constants/theme';

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const color = statusColors[status];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={[styles.text, { color }]}>{INCIDENT_STATUS_LABELS[status].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceAlt,
  },
  text: {
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: letterSpacing.wide,
  },
});
