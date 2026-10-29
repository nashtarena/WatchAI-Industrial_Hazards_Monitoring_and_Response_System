import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCard } from '../../components/AlertCard';
import { Banner } from '../../components/Banner';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips, FilterOption } from '../../components/FilterChips';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, font, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useSmsAlert } from '../../hooks/useSmsAlert';
import { useWatchAI } from '../../hooks/useWatchAI';
import { canEscalateBySms, isActionAllowed } from '../../lib/incidentFlow';
import { ALERT_LANES, ALERT_LANE_LABELS, AlertLane } from '../../types/notification';

const LANE_ACCENTS: Record<AlertLane, string> = {
  CRITICAL: colors.critical,
  HIGH: colors.high,
  MEDIUM: colors.medium,
  GENERAL: colors.accent,
};

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { alerts, incidents, applyIncidentAction } = useWatchAI();
  const sms = useSmsAlert();
  const [lane, setLane] = useState<AlertLane>('CRITICAL');
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);

  const incidentById = useMemo(() => {
    const map = new Map<string, (typeof incidents)[number]>();
    incidents.forEach((incident) => map.set(incident.id, incident));
    return map;
  }, [incidents]);

  const options = useMemo<FilterOption<AlertLane>[]>(
    () =>
      ALERT_LANES.map((value) => ({
        value,
        label: ALERT_LANE_LABELS[value],
        count: alerts.filter((alert) => alert.lane === value).length,
        accent: LANE_ACCENTS[value],
      })),
    [alerts],
  );

  const visible = useMemo(() => alerts.filter((alert) => alert.lane === lane), [alerts, lane]);

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
        eyebrow="Alerting"
        title="Alerts"
        subtitle="Local alerts raised by WatchAI. Notifications are generated on this device only."
      />

      <FilterChips options={options} selected={lane} onSelect={setLane} />

      {sms.message ? <Banner tone="info" title="SMS" message={sms.message} /> : null}

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${ALERT_LANE_LABELS[lane].toLowerCase()} alerts`}
          message="Alerts appear here the moment an incident of this severity is created."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((alert) => {
            const incident = incidentById.get(alert.incidentId);
            const canAcknowledge = incident
              ? isActionAllowed(incident.status, 'ACKNOWLEDGE', role)
              : false;
            const showSms = incident ? canEscalateBySms(incident, role) : false;

            return (
              <AlertCard
                key={alert.id}
                alert={alert}
                status={incident?.status ?? null}
                smsBusy={busyAlertId === alert.id && sms.isSending}
                onOpen={() =>
                  router.push({ pathname: '/incidents/[id]', params: { id: alert.incidentId } })
                }
                onAcknowledge={
                  canAcknowledge ? () => applyIncidentAction(alert.incidentId, 'ACKNOWLEDGE') : undefined
                }
                onSendSms={
                  showSms && incident
                    ? () => {
                        setBusyAlertId(alert.id);
                        void sms.send(incident).finally(() => setBusyAlertId(null));
                      }
                    : undefined
                }
              />
            );
          })}
        </View>
      )}

      <Text style={styles.footnote}>
        Alerts marked IN-APP ONLY were not delivered as a device notification, usually because notification
        permission has not been granted.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  footnote: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
    marginTop: spacing.md,
  },
});
