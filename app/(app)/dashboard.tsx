import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Banner';
import { DemoTag } from '../../components/DemoTag';
import { EmptyState } from '../../components/EmptyState';
import { IncidentCard } from '../../components/IncidentCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SeverityBadge } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { incidentTypeLabel } from '../../constants/incidentTypes';
import { PERMISSIONS, can } from '../../constants/permissions';
import { ROLE_LABELS } from '../../constants/roles';
import { colors, font, letterSpacing, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useWatchAI } from '../../hooks/useWatchAI';
import { isGeminiConfigured } from '../../lib/config';
import { formatClock, formatTimestamp } from '../../lib/format';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { incidents, alerts, stats, simulateCriticalIncident } = useWatchAI();
  const notifications = useNotifications();
  const [isSimulating, setIsSimulating] = useState(false);

  const canUpload = can(role, PERMISSIONS.UPLOAD_VIDEO);
  const canAnalyze = can(role, PERMISSIONS.ANALYZE_VIDEO);

  const recentIncidents = useMemo(() => incidents.slice(0, 3), [incidents]);
  const recentAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);
  const statusById = useMemo(() => {
    const map = new Map<string, (typeof incidents)[number]>();
    incidents.forEach((incident) => map.set(incident.id, incident));
    return map;
  }, [incidents]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    await simulateCriticalIncident();
    setIsSimulating(false);
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
        eyebrow="WatchAI console"
        title="Safety Overview"
        subtitle={`${user?.name ?? 'Operator'} · ${user?.department ?? ''}`}
        right={
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role ? ROLE_LABELS[role].toUpperCase() : '—'}</Text>
          </View>
        }
      />

      {canAnalyze && !isGeminiConfigured() ? (
        <Banner
          tone="warning"
          title="Gemini not configured"
          message="Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart Expo to run real footage analysis. Demo mode still works."
        />
      ) : null}

      {notifications.permission !== 'GRANTED' ? (
        <View style={styles.permissionBlock}>
          <Banner
            tone="info"
            title="Notifications"
            message="Local notifications are not enabled yet, so alerts will only appear inside the app."
          />
          <AppButton
            label="Enable Notifications"
            variant="secondary"
            loading={notifications.isBusy}
            loadingLabel="Requesting..."
            onPress={() => void notifications.request()}
          />
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <StatCard label="Total incidents" value={stats.total} accent={colors.accent} />
        <StatCard label="Critical" value={stats.critical} accent={colors.critical} emphasis />
        <StatCard label="High risk" value={stats.high} accent={colors.high} />
        <StatCard label="Pending review" value={stats.pendingReview} accent={colors.medium} />
        <StatCard label="Resolved" value={stats.resolved} accent={colors.success} />
      </View>
      <Text style={styles.statsNote}>
        Counters are computed live from local in-app state. Records tagged DEMO DATA are seeded for this
        demonstration and do not come from a CCTV archive.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        <View style={styles.actions}>
          {canUpload ? (
            <AppButton label="Analyze CCTV Footage" onPress={() => router.push('/videos/upload')} />
          ) : null}
          {canAnalyze ? (
            <AppButton
              label="DEMO: Simulate Critical Incident"
              variant="demo"
              loading={isSimulating}
              loadingLabel="Creating demo incident..."
              onPress={() => void handleSimulate()}
              helperText="Runs the full critical workflow without calling Gemini."
            />
          ) : null}
          <AppButton
            label="Test Critical Notification"
            variant="ghost"
            loading={notifications.isBusy}
            loadingLabel="Sending..."
            onPress={() => void notifications.sendTestCritical()}
          />
          {notifications.message ? <Text style={styles.notificationMessage}>{notifications.message}</Text> : null}
          {!canUpload ? (
            <Text style={styles.readOnlyNote}>
              Your role has read-only access to footage analysis. Incident review actions remain available
              where permitted.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>RECENT INCIDENTS</Text>
          <Pressable onPress={() => router.push('/incidents')} accessibilityRole="button">
            <Text style={styles.link}>VIEW ALL</Text>
          </Pressable>
        </View>
        {recentIncidents.length === 0 ? (
          <EmptyState title="No incidents yet" message="Analyse a CCTV clip or run demo mode to create one." />
        ) : (
          <View style={styles.list}>
            {recentIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                compact
                onPress={() => router.push({ pathname: '/incidents/[id]', params: { id: incident.id } })}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>RECENT ALERTS</Text>
          <Pressable onPress={() => router.push('/alerts')} accessibilityRole="button">
            <Text style={styles.link}>VIEW ALL</Text>
          </Pressable>
        </View>
        {recentAlerts.length === 0 ? (
          <EmptyState title="No alerts raised" message="Alerts appear here as soon as an incident is detected." />
        ) : (
          <View style={styles.list}>
            {recentAlerts.map((alert) => {
              const incident = statusById.get(alert.incidentId);
              return (
                <Pressable
                  key={alert.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/incidents/[id]', params: { id: alert.incidentId } })
                  }
                  style={({ pressed }) => [styles.alertRow, pressed ? styles.alertRowPressed : null]}
                >
                  <View style={styles.alertRowMain}>
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {incidentTypeLabel(alert.incidentType)}
                    </Text>
                    <Text style={styles.alertMeta}>
                      Footage {formatTimestamp(alert.timestamp)} · raised {formatClock(alert.createdAt)}
                    </Text>
                    <View style={styles.alertBadges}>
                      {incident ? <StatusBadge status={incident.status} /> : null}
                      <DemoTag source={alert.source} />
                    </View>
                  </View>
                  <SeverityBadge severity={alert.severity} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
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
    gap: spacing.lg,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: colors.accent,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  permissionBlock: {
    gap: spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsNote: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
    marginTop: -spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  link: {
    color: colors.accent,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  actions: {
    gap: spacing.sm,
  },
  notificationMessage: {
    color: colors.textMuted,
    fontSize: font.label,
  },
  readOnlyNote: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
  },
  list: {
    gap: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertRowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  alertRowMain: {
    flex: 1,
    gap: spacing.xs,
  },
  alertTitle: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '700',
  },
  alertMeta: {
    color: colors.textMuted,
    fontSize: font.micro,
  },
  alertBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
