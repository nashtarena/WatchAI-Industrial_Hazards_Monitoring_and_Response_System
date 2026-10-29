import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';
import { formatClock } from '../lib/format';
import { SmsDispatch } from '../types/notification';

const TONES: Record<SmsDispatch['status'], { color: string; label: string }> = {
  PENDING: { color: colors.accent, label: 'SENDING SMS ALERT' },
  SENT: { color: colors.success, label: 'SMS ALERT SENT' },
  QUEUED: { color: colors.success, label: 'SMS ALERT ACCEPTED BY CARRIER' },
  DRY_RUN: { color: colors.demo, label: 'SMS ALERT SIMULATED (DRY RUN)' },
  FAILED: { color: colors.critical, label: 'AUTOMATIC SMS FAILED' },
};

interface SmsDispatchStatusProps {
  dispatch: SmsDispatch | undefined;
  /** Shown when escalation applies to this incident but no server is configured. */
  notConfiguredNote?: string;
  onDark?: boolean;
}

export function SmsDispatchStatusCard({
  dispatch,
  notConfiguredNote,
  onDark = false,
}: SmsDispatchStatusProps) {
  if (!dispatch) {
    if (!notConfiguredNote) return null;
    return (
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textDim }]}>AUTOMATIC SMS</Text>
        <Text style={[styles.message, onDark ? styles.messageOnDark : null]}>{notConfiguredNote}</Text>
      </View>
    );
  }

  const tone = TONES[dispatch.status];

  return (
    <View style={[styles.card, { borderColor: tone.color, backgroundColor: `${tone.color}14` }]}>
      <View style={styles.headerRow}>
        {dispatch.status === 'PENDING' ? <ActivityIndicator size="small" color={tone.color} /> : null}
        <Text style={[styles.label, { color: tone.color }]}>{tone.label}</Text>
      </View>
      <Text style={[styles.message, onDark ? styles.messageOnDark : null]}>{dispatch.message}</Text>
      <Text style={styles.meta}>
        {dispatch.automatic ? 'Sent automatically' : 'Manual retry'}
        {dispatch.recipient ? ` · ${dispatch.recipient}` : ''}
        {` · ${formatClock(dispatch.at)}`}
        {dispatch.providerId ? ` · ref ${dispatch.providerId.slice(-8)}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  messageOnDark: {
    color: '#F4E7E7',
  },
  meta: {
    color: colors.textDim,
    fontSize: font.micro,
  },
});
