import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IncidentStatus, incidentTypeLabel } from '../constants/incidentTypes';
import { colors, font, radius, severityColors, spacing } from '../constants/theme';
import { formatClock, formatTimestamp } from '../lib/format';
import { Alert } from '../types/notification';
import { AppButton } from './AppButton';
import { DemoTag } from './DemoTag';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface AlertCardProps {
  alert: Alert;
  status: IncidentStatus | null;
  onOpen: () => void;
  onAcknowledge?: () => void;
  onSendSms?: () => void;
  smsBusy?: boolean;
}

export function AlertCard({
  alert,
  status,
  onOpen,
  onAcknowledge,
  onSendSms,
  smsBusy = false,
}: AlertCardProps) {
  const accent = severityColors[alert.severity];

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {incidentTypeLabel(alert.incidentType)}
        </Text>
        <SeverityBadge severity={alert.severity} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Footage {formatTimestamp(alert.timestamp)}</Text>
        <Text style={styles.metaDivider}>·</Text>
        <Text style={styles.meta}>Raised {formatClock(alert.createdAt)}</Text>
      </View>

      <View style={styles.badgeRow}>
        {status ? <StatusBadge status={status} /> : null}
        <DemoTag source={alert.source} />
        {!alert.notificationDelivered ? (
          <Text style={styles.notDelivered}>IN-APP ONLY</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <AppButton label="Open Incident" variant="secondary" onPress={onOpen} style={styles.action} />
        {onAcknowledge ? (
          <AppButton label="Acknowledge" variant="ghost" onPress={onAcknowledge} style={styles.action} />
        ) : null}
        {onSendSms ? (
          <AppButton
            label="Send SMS"
            variant="critical"
            loading={smsBusy}
            loadingLabel="Sending alert..."
            onPress={onSendSms}
            style={styles.action}
          />
        ) : null}
      </View>
    </View>
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
  },
  metaDivider: {
    color: colors.textDim,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  notDelivered: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 110,
  },
});
