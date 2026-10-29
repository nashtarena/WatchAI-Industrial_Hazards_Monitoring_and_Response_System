import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { incidentTypeLabel } from '../constants/incidentTypes';
import { PERMISSIONS, can } from '../constants/permissions';
import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useSmsAlert } from '../hooks/useSmsAlert';
import { useWatchAI } from '../hooks/useWatchAI';
import { formatConfidence, formatTimestamp, orEmDash } from '../lib/format';
import { isActionAllowed } from '../lib/incidentFlow';
import { AppButton } from './AppButton';
import { DemoTag } from './DemoTag';
import { SmsDispatchStatusCard } from './SmsDispatchStatus';

/**
 * Full-screen critical alert. Mounted once at the root so a critical incident is
 * never buried behind navigation layers.
 */
export function CriticalAlert() {
  const router = useRouter();
  const { role, isAuthenticated } = useAuth();
  const {
    criticalIncident,
    voiceAlarmActive,
    voiceAlarmEnabled,
    dismissCriticalAlert,
    stopVoiceAlarm,
    restartVoiceAlarm,
    applyIncidentAction,
    smsDispatches,
    autoSmsConfigured,
    autoSmsEnabled,
    retryAlertSms,
  } = useWatchAI();
  const sms = useSmsAlert();

  const incident = criticalIncident;
  const visible = Boolean(incident) && isAuthenticated;

  if (!incident) return null;

  const dispatch = smsDispatches[incident.id];
  const showSms = can(role, PERMISSIONS.SEND_SMS);
  const showAcknowledge = isActionAllowed(incident.status, 'ACKNOWLEDGE', role);
  const showReview = can(role, PERMISSIONS.VIEW_INCIDENT);

  const handleAcknowledge = () => {
    applyIncidentAction(incident.id, 'ACKNOWLEDGE');
  };

  const handleReview = () => {
    stopVoiceAlarm();
    dismissCriticalAlert();
    router.push({ pathname: '/incidents/[id]', params: { id: incident.id } });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={dismissCriticalAlert}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>CRITICAL ALERT</Text>
          </View>

          <Text style={styles.incidentTitle}>{incidentTypeLabel(incident.incidentType).toUpperCase()}</Text>
          <Text style={styles.severity}>CRITICAL</Text>

          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>CONFIDENCE</Text>
              <Text style={styles.metricValue}>{formatConfidence(incident.confidence)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>FOOTAGE TIME</Text>
              <Text style={styles.metricValue}>{formatTimestamp(incident.timestamp)}</Text>
            </View>
          </View>

          <DemoTag source={incident.source} />

          <View style={styles.block}>
            <Text style={styles.blockLabel}>DESCRIPTION</Text>
            <Text style={styles.blockText}>{incident.description}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockLabel}>EVIDENCE</Text>
            <Text style={styles.blockText}>{orEmDash(incident.evidence)}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockLabel}>RECOMMENDED ACTION</Text>
            <Text style={styles.blockText}>{orEmDash(incident.recommendedAction)}</Text>
          </View>

          <View style={styles.verifyNotice}>
            <Text style={styles.verifyText}>
              HUMAN VERIFICATION REQUIRED. WatchAI has flagged this footage — a person must confirm the
              situation on site before it is closed.
            </Text>
          </View>

          <SmsDispatchStatusCard
            dispatch={dispatch}
            onDark
            notConfiguredNote={
              autoSmsConfigured
                ? autoSmsEnabled
                  ? undefined
                  : 'Automatic SMS escalation is switched off in Profile. Send the alert manually below.'
                : 'Automatic SMS is not configured. Start the alert server and set EXPO_PUBLIC_ALERT_API_URL to escalate without approval.'
            }
          />

          {sms.message ? <Text style={styles.smsMessage}>{sms.message}</Text> : null}

          <View style={styles.actions}>
            {dispatch?.status === 'FAILED' ? (
              <AppButton
                label="RETRY AUTOMATIC SMS"
                variant="critical"
                onPress={() => void retryAlertSms(incident.id)}
              />
            ) : null}

            {showSms ? (
              <AppButton
                label={autoSmsConfigured ? 'SEND SMS MANUALLY' : 'SEND SMS ALERT'}
                variant={dispatch && dispatch.status !== 'FAILED' ? 'secondary' : 'critical'}
                loading={sms.isSending}
                loadingLabel="Sending alert..."
                onPress={() => void sms.send(incident)}
                helperText={`Opens your SMS app addressed to ${sms.contact}`}
              />
            ) : null}

            {voiceAlarmEnabled ? (
              voiceAlarmActive ? (
                <AppButton label="STOP VOICE ALARM" variant="secondary" onPress={stopVoiceAlarm} />
              ) : (
                <AppButton label="REPLAY VOICE ALARM" variant="ghost" onPress={restartVoiceAlarm} />
              )
            ) : null}

            {showAcknowledge ? (
              <AppButton label="ACKNOWLEDGE" variant="success" onPress={handleAcknowledge} />
            ) : null}

            {showReview ? (
              <AppButton label="REVIEW INCIDENT" variant="secondary" onPress={handleReview} />
            ) : null}

            <AppButton label="Dismiss Alert" variant="ghost" onPress={dismissCriticalAlert} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.criticalDeep,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  banner: {
    backgroundColor: colors.critical,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: font.body,
    fontWeight: '900',
    letterSpacing: letterSpacing.wider,
  },
  incidentTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  severity: {
    color: colors.critical,
    fontSize: font.title,
    fontWeight: '900',
    letterSpacing: letterSpacing.wider,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.critical,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.10)',
  },
  metricLabel: {
    color: '#FFB4B4',
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: font.title,
    fontWeight: '900',
  },
  block: {
    gap: spacing.xs,
  },
  blockLabel: {
    color: '#FF8C8C',
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  blockText: {
    color: '#F4E7E7',
    fontSize: font.body,
    lineHeight: 22,
  },
  verifyNotice: {
    borderWidth: 1,
    borderColor: colors.critical,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  verifyText: {
    color: '#FFD9D9',
    fontSize: font.label,
    fontWeight: '700',
    lineHeight: 20,
  },
  smsMessage: {
    color: '#FFD9D9',
    fontSize: font.label,
    fontStyle: 'italic',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
