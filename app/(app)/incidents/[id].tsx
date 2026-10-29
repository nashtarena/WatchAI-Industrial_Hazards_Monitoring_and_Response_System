import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnomalyVideoPlayer } from '../../../components/AnomalyVideoPlayer';
import { AppButton } from '../../../components/AppButton';
import { Banner } from '../../../components/Banner';
import { ConfidenceBar } from '../../../components/ConfidenceBar';
import { DemoTag } from '../../../components/DemoTag';
import { EmptyState } from '../../../components/EmptyState';
import { InfoRow } from '../../../components/InfoRow';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SeverityBadge } from '../../../components/SeverityBadge';
import { SmsDispatchStatusCard } from '../../../components/SmsDispatchStatus';
import { StatusBadge } from '../../../components/StatusBadge';
import { INCIDENT_STATUS_LABELS, incidentTypeLabel } from '../../../constants/incidentTypes';
import { colors, font, letterSpacing, radius, spacing } from '../../../constants/theme';
import { useAuth } from '../../../hooks/useAuth';
import { useSmsAlert } from '../../../hooks/useSmsAlert';
import { useWatchAI } from '../../../hooks/useWatchAI';
import { formatConfidence, formatDateTime, formatTimestamp, orEmDash } from '../../../lib/format';
import { ACTION_LABELS, allowedActions, canEscalateBySms } from '../../../lib/incidentFlow';
import { IncidentAction } from '../../../types/incident';

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const {
    getIncident,
    applyIncidentAction,
    openCriticalAlert,
    smsDispatches,
    autoSmsConfigured,
    retryAlertSms,
  } = useWatchAI();
  const sms = useSmsAlert();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const incident = typeof id === 'string' ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <View style={[styles.flex, styles.guard, { paddingTop: insets.top + spacing.xl }]}>
        <EmptyState title="Incident not found" message="This record is no longer in local state." />
        <AppButton label="Back to incidents" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const actions = allowedActions(incident.status, role);
  const showSms = canEscalateBySms(incident, role);
  const dispatch = smsDispatches[incident.id];

  const handleAction = (action: IncidentAction) => {
    const next = applyIncidentAction(incident.id, action);
    setActionMessage(
      next
        ? `Status updated to ${INCIDENT_STATUS_LABELS[next]}.`
        : 'That transition is not available for this incident.',
    );
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Incident detail"
        title={incidentTypeLabel(incident.incidentType)}
        subtitle={`Detected ${formatDateTime(incident.createdAt)}`}
        right={<SeverityBadge severity={incident.severity} size="md" />}
      />

      <View style={styles.badgeRow}>
        <StatusBadge status={incident.status} />
        <DemoTag source={incident.source} />
      </View>

      {incident.source !== 'GEMINI' ? (
        <Banner
          tone="demo"
          message={
            incident.source === 'DEMO'
              ? 'Simulated incident created by demo mode. It was not produced by a Gemini analysis.'
              : 'Seeded demonstration record. It was not produced by a Gemini analysis.'
          }
        />
      ) : null}

      {incident.videoUri ? (
        <View style={styles.playerBlock}>
          <Text style={styles.sectionTitle}>FOOTAGE · ANOMALOUS REGION</Text>
          <AnomalyVideoPlayer
            uri={incident.videoUri}
            incidents={[incident]}
            initialIncidentId={incident.id}
          />
        </View>
      ) : incident.region ? (
        <Banner
          tone="info"
          title="Region recorded"
          message="Gemini localised this incident in the frame, but the source clip is no longer available on this device to replay."
        />
      ) : null}

      <View style={styles.card}>
        <ConfidenceBar confidence={incident.confidence} severity={incident.severity} />
        <InfoRow label="Incident type" value={incidentTypeLabel(incident.incidentType)} />
        <InfoRow label="Severity" value={incident.severity} />
        <InfoRow label="Confidence" value={formatConfidence(incident.confidence)} />
        <InfoRow label="Footage timestamp" value={formatTimestamp(incident.timestamp)} />
        <InfoRow label="Status" value={INCIDENT_STATUS_LABELS[incident.status]} />
        {incident.videoName ? <InfoRow label="Source clip" value={incident.videoName} /> : null}
      </View>

      <View style={styles.card}>
        <InfoRow label="Description" value={incident.description} stacked />
        <InfoRow label="Evidence" value={orEmDash(incident.evidence)} stacked />
        <InfoRow label="Recommended action" value={orEmDash(incident.recommendedAction)} stacked />
      </View>

      <SmsDispatchStatusCard dispatch={dispatch} />

      {actionMessage ? <Banner tone="info" title="Update" message={actionMessage} /> : null}
      {sms.message ? <Banner tone="info" title="SMS" message={sms.message} /> : null}

      <View style={styles.actions}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>

        {dispatch?.status === 'FAILED' && showSms ? (
          <AppButton
            label="Retry Automatic SMS"
            variant="critical"
            onPress={() => void retryAlertSms(incident.id)}
          />
        ) : null}

        {showSms ? (
          <AppButton
            label={autoSmsConfigured ? 'Send SMS Manually' : 'Send SMS Alert'}
            variant={dispatch && dispatch.status !== 'FAILED' ? 'secondary' : 'critical'}
            loading={sms.isSending}
            loadingLabel="Sending alert..."
            onPress={() => void sms.send(incident)}
            helperText={`Opens your SMS app addressed to ${sms.contact}`}
          />
        ) : null}

        {incident.severity === 'CRITICAL' ? (
          <AppButton
            label="Open Critical Alert"
            variant="secondary"
            onPress={() => openCriticalAlert(incident.id)}
          />
        ) : null}

        {actions.map((action) => (
          <AppButton
            key={action}
            label={ACTION_LABELS[action]}
            variant={action === 'RESOLVE' ? 'success' : action === 'REJECT' ? 'ghost' : 'secondary'}
            onPress={() => handleAction(action)}
          />
        ))}

        {actions.length === 0 && !showSms ? (
          <Text style={styles.noActions}>
            No further action is available to your role for an incident in this state.
          </Text>
        ) : null}

        <AppButton label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  guard: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  playerBlock: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  noActions: {
    color: colors.textDim,
    fontSize: font.label,
    lineHeight: 20,
  },
});
