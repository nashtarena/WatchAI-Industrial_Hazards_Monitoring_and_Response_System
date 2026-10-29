import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { incidentTypeLabel } from '../constants/incidentTypes';
import { colors, font, letterSpacing, radius, severityColors, spacing } from '../constants/theme';
import { formatClock, formatConfidence, formatTimestamp } from '../lib/format';
import { Incident } from '../types/incident';
import { ConfidenceBar } from './ConfidenceBar';
import { DemoTag } from './DemoTag';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface IncidentCardProps {
  incident: Incident;
  onPress: () => void;
  compact?: boolean;
}

export function IncidentCard({ incident, onPress, compact = false }: IncidentCardProps) {
  const accent = severityColors[incident.severity];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderLeftColor: accent }, pressed ? styles.pressed : null]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {incidentTypeLabel(incident.incidentType)}
        </Text>
        <SeverityBadge severity={incident.severity} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          <Text style={styles.metaLabel}>AT </Text>
          {formatTimestamp(incident.timestamp)}
        </Text>
        <Text style={styles.metaDivider}>·</Text>
        <Text style={[styles.meta, { color: accent }]}>{formatConfidence(incident.confidence)}</Text>
        <Text style={styles.metaDivider}>·</Text>
        <Text style={styles.meta}>{formatClock(incident.createdAt)}</Text>
      </View>

      {!compact ? (
        <Text style={styles.description} numberOfLines={2}>
          {incident.description}
        </Text>
      ) : null}

      {!compact ? <ConfidenceBar confidence={incident.confidence} severity={incident.severity} /> : null}

      <View style={styles.footerRow}>
        <StatusBadge status={incident.status} />
        <DemoTag source={incident.source} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: font.heading,
    fontWeight: '700',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  meta: {
    color: colors.textMuted,
    fontSize: font.label,
    fontWeight: '600',
  },
  metaLabel: {
    color: colors.textDim,
    fontSize: font.micro,
    letterSpacing: letterSpacing.wide,
  },
  metaDivider: {
    color: colors.textDim,
    fontSize: font.label,
  },
  description: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
