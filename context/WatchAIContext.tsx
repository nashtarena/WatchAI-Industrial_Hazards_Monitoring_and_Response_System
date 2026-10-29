import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildDemoCriticalIncident, buildSeedIncidents } from '../constants/demoData';
import { IncidentStatus } from '../constants/incidentTypes';
import { createId } from '../lib/format';
import {
  IncidentStats,
  computeStats,
  laneForSeverity,
  nextStatusFor,
  sortByNewest,
  sortBySeverityDesc,
} from '../lib/incidentFlow';
import { dispatchSmsAlert } from '../services/alertDispatchService';
import * as notificationService from '../services/notificationService';
import * as smsService from '../services/smsService';
import * as voiceService from '../services/voiceService';
import { AnalysisResult, Incident, IncidentAction } from '../types/incident';
import { Alert, NotificationPermissionState, SmsDispatch } from '../types/notification';
import { SelectedVideo } from '../types/video';
import { AUTO_SMS_MIN_SEVERITY, isAutoSmsConfigured, isAutoSmsEligible } from '../lib/config';

export interface WatchAIContextValue {
  incidents: Incident[];
  alerts: Alert[];
  selectedVideo: SelectedVideo | null;
  analysisResult: AnalysisResult | null;
  analysisHistory: AnalysisResult[];
  stats: IncidentStats;
  /** The incident currently taking over the screen with a critical alert. */
  criticalIncident: Incident | null;
  voiceAlarmActive: boolean;
  voiceAlarmEnabled: boolean;
  notificationPermission: NotificationPermissionState;
  /** Automatic SMS escalation state, keyed by incident id. */
  smsDispatches: Record<string, SmsDispatch>;
  autoSmsEnabled: boolean;
  autoSmsConfigured: boolean;
  autoSmsMinSeverity: typeof AUTO_SMS_MIN_SEVERITY;
  setSelectedVideo: (video: SelectedVideo | null) => void;
  clearAnalysisResult: () => void;
  /** Applies severity-driven behaviour for every incident in a validated result. */
  ingestAnalysis: (result: AnalysisResult) => Promise<void>;
  simulateCriticalIncident: () => Promise<Incident>;
  applyIncidentAction: (incidentId: string, action: IncidentAction) => IncidentStatus | null;
  getIncident: (incidentId: string) => Incident | undefined;
  openCriticalAlert: (incidentId: string) => void;
  dismissCriticalAlert: () => void;
  stopVoiceAlarm: () => void;
  restartVoiceAlarm: () => void;
  setVoiceAlarmEnabled: (enabled: boolean) => Promise<void>;
  setAutoSmsEnabled: (enabled: boolean) => Promise<void>;
  /** Re-runs a failed automatic escalation for one incident. */
  retryAlertSms: (incidentId: string) => Promise<void>;
  refreshNotificationPermission: () => Promise<NotificationPermissionState>;
  requestNotificationPermission: () => Promise<NotificationPermissionState>;
}

export const WatchAIContext = createContext<WatchAIContextValue | null>(null);

export function WatchAIProvider({ children }: { children: React.ReactNode }) {
  // Demonstration seed records: local only, never presented as archive data.
  const [seedIncidents] = useState<Incident[]>(() => buildSeedIncidents());
  const [incidents, setIncidents] = useState<Incident[]>(seedIncidents);
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    seedIncidents.map((incident) => buildAlert(incident, false)),
  );
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [criticalIncidentId, setCriticalIncidentId] = useState<string | null>(null);
  const [voiceAlarmActive, setVoiceAlarmActive] = useState(false);
  const [voiceAlarmEnabled, setVoiceAlarmEnabledState] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>('UNDETERMINED');

  const [smsDispatches, setSmsDispatches] = useState<Record<string, SmsDispatch>>({});
  const [autoSmsEnabled, setAutoSmsEnabledState] = useState(true);

  const voiceAlarmEnabledRef = useRef(true);
  const autoSmsEnabledRef = useRef(true);
  /** Guards against texting twice for the same incident. */
  const dispatchedRef = useRef<Set<string>>(new Set());
  const incidentsRef = useRef<Incident[]>(incidents);

  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);

  useEffect(() => {
    voiceService.setAlarmStateListener(setVoiceAlarmActive);
    return () => {
      voiceService.setAlarmStateListener(null);
      voiceService.stopAlarm();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [enabled, permission] = await Promise.all([
        voiceService.getVoiceAlarmPreference(),
        notificationService.getPermissionState(),
      ]);
      if (cancelled) return;
      voiceAlarmEnabledRef.current = enabled;
      setVoiceAlarmEnabledState(enabled);
      setNotificationPermission(permission);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const enabled = await smsService.getAutoSmsPreference();
      if (cancelled) return;
      autoSmsEnabledRef.current = enabled;
      setAutoSmsEnabledState(enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Escalates one incident through the alert server. Runs without human approval for
   * incidents at or above the configured severity, and is deduplicated per incident.
   */
  const dispatchAlert = useCallback(async (incident: Incident, automatic: boolean) => {
    if (automatic && dispatchedRef.current.has(incident.id)) return;
    dispatchedRef.current.add(incident.id);

    const startedAt = new Date().toISOString();
    setSmsDispatches((current) => ({
      ...current,
      [incident.id]: {
        incidentId: incident.id,
        status: 'PENDING',
        message: 'Sending SMS alert...',
        recipient: null,
        providerId: null,
        at: startedAt,
        automatic,
      },
    }));

    const contact = await smsService.getEmergencyContact();
    const result = await dispatchSmsAlert(incident, contact);

    setSmsDispatches((current) => ({
      ...current,
      [incident.id]: {
        incidentId: incident.id,
        status: result.status,
        message: result.message,
        recipient: result.recipient,
        providerId: result.providerId,
        at: new Date().toISOString(),
        automatic,
      },
    }));

    // A failure must not block a later retry.
    if (result.status === 'FAILED') {
      dispatchedRef.current.delete(incident.id);
    }
  }, []);

  const registerIncidents = useCallback(async (incoming: Incident[]) => {
    if (incoming.length === 0) return;

    setIncidents((current) => [...incoming, ...current]);

    // Highest severity first: the critical alert must win the screen.
    const ordered = sortBySeverityDesc(incoming);
    const createdAlerts: Alert[] = [];

    for (const incident of ordered) {
      const delivered = await notificationService.notifyIncident(incident);
      createdAlerts.push(buildAlert(incident, delivered));
    }

    setAlerts((current) => [...createdAlerts, ...current]);

    const firstCritical = ordered.find((incident) => incident.severity === 'CRITICAL');
    if (firstCritical) {
      setCriticalIncidentId(firstCritical.id);
      if (voiceAlarmEnabledRef.current) {
        voiceService.startAlarm(firstCritical);
      }
    }

    // Automatic escalation: no human approval, and deliberately not awaited so the
    // alert UI stays responsive while the request is in flight.
    if (autoSmsEnabledRef.current && isAutoSmsConfigured()) {
      ordered
        .filter((incident) => isAutoSmsEligible(incident.severity))
        .forEach((incident) => void dispatchAlert(incident, true));
    }
  }, [dispatchAlert]);

  const ingestAnalysis = useCallback(
    async (result: AnalysisResult) => {
      setAnalysisResult(result);
      setAnalysisHistory((current) => [result, ...current]);
      await registerIncidents(result.incidents);
    },
    [registerIncidents],
  );

  const simulateCriticalIncident = useCallback(async () => {
    const incident = buildDemoCriticalIncident();
    await registerIncidents([incident]);
    return incident;
  }, [registerIncidents]);

  /** Returns the new status, or null when the transition is not permitted. */
  const applyIncidentAction = useCallback((incidentId: string, action: IncidentAction) => {
    const target = incidentsRef.current.find((incident) => incident.id === incidentId);
    if (!target) return null;

    const next: IncidentStatus | null = nextStatusFor(target.status, action);
    if (!next) return null;

    setIncidents((current) =>
      current.map((incident) => (incident.id === incidentId ? { ...incident, status: next } : incident)),
    );

    // Acknowledging or rejecting is the operator taking ownership: the alarm stops.
    if (action === 'ACKNOWLEDGE' || action === 'REJECT') {
      voiceService.stopAlarm();
      setCriticalIncidentId((current) => (current === incidentId ? null : current));
    }

    return next;
  }, []);

  const getIncident = useCallback(
    (incidentId: string) => incidents.find((incident) => incident.id === incidentId),
    [incidents],
  );

  const openCriticalAlert = useCallback(
    (incidentId: string) => {
      const incident = incidents.find((item) => item.id === incidentId);
      if (!incident) return;
      setCriticalIncidentId(incidentId);
      if (incident.severity === 'CRITICAL' && voiceAlarmEnabledRef.current) {
        voiceService.startAlarm(incident);
      }
    },
    [incidents],
  );

  const dismissCriticalAlert = useCallback(() => {
    voiceService.stopAlarm();
    setCriticalIncidentId(null);
  }, []);

  const stopVoiceAlarm = useCallback(() => {
    voiceService.stopAlarm();
  }, []);

  const criticalIncident = useMemo(
    () => incidents.find((incident) => incident.id === criticalIncidentId) ?? null,
    [incidents, criticalIncidentId],
  );

  const restartVoiceAlarm = useCallback(() => {
    if (!criticalIncident || !voiceAlarmEnabledRef.current) return;
    voiceService.startAlarm(criticalIncident);
  }, [criticalIncident]);

  const setAutoSmsEnabled = useCallback(async (enabled: boolean) => {
    autoSmsEnabledRef.current = enabled;
    setAutoSmsEnabledState(enabled);
    await smsService.setAutoSmsPreference(enabled);
  }, []);

  const retryAlertSms = useCallback(
    async (incidentId: string) => {
      const incident = incidentsRef.current.find((item) => item.id === incidentId);
      if (!incident) return;
      dispatchedRef.current.delete(incidentId);
      await dispatchAlert(incident, false);
    },
    [dispatchAlert],
  );

  const setVoiceAlarmEnabled = useCallback(async (enabled: boolean) => {
    voiceAlarmEnabledRef.current = enabled;
    setVoiceAlarmEnabledState(enabled);
    if (!enabled) {
      voiceService.stopAlarm();
    }
    await voiceService.setVoiceAlarmPreference(enabled);
  }, []);

  const refreshNotificationPermission = useCallback(async () => {
    const permission = await notificationService.getPermissionState();
    setNotificationPermission(permission);
    return permission;
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const permission = await notificationService.requestPermissions();
    setNotificationPermission(permission);
    return permission;
  }, []);

  const clearAnalysisResult = useCallback(() => {
    setAnalysisResult(null);
  }, []);

  const sortedIncidents = useMemo(() => sortByNewest(incidents), [incidents]);
  const stats = useMemo(() => computeStats(incidents), [incidents]);

  const value = useMemo<WatchAIContextValue>(
    () => ({
      incidents: sortedIncidents,
      alerts,
      selectedVideo,
      analysisResult,
      analysisHistory,
      stats,
      criticalIncident,
      voiceAlarmActive,
      voiceAlarmEnabled,
      notificationPermission,
      smsDispatches,
      autoSmsEnabled,
      autoSmsConfigured: isAutoSmsConfigured(),
      autoSmsMinSeverity: AUTO_SMS_MIN_SEVERITY,
      setSelectedVideo,
      clearAnalysisResult,
      ingestAnalysis,
      simulateCriticalIncident,
      applyIncidentAction,
      getIncident,
      openCriticalAlert,
      dismissCriticalAlert,
      stopVoiceAlarm,
      restartVoiceAlarm,
      setVoiceAlarmEnabled,
      setAutoSmsEnabled,
      retryAlertSms,
      refreshNotificationPermission,
      requestNotificationPermission,
    }),
    [
      sortedIncidents,
      alerts,
      selectedVideo,
      analysisResult,
      analysisHistory,
      stats,
      criticalIncident,
      voiceAlarmActive,
      voiceAlarmEnabled,
      notificationPermission,
      smsDispatches,
      autoSmsEnabled,
      clearAnalysisResult,
      ingestAnalysis,
      simulateCriticalIncident,
      applyIncidentAction,
      getIncident,
      openCriticalAlert,
      dismissCriticalAlert,
      stopVoiceAlarm,
      restartVoiceAlarm,
      setVoiceAlarmEnabled,
      setAutoSmsEnabled,
      retryAlertSms,
      refreshNotificationPermission,
      requestNotificationPermission,
    ],
  );

  return <WatchAIContext.Provider value={value}>{children}</WatchAIContext.Provider>;
}

function buildAlert(incident: Incident, notificationDelivered: boolean): Alert {
  const lane = laneForSeverity(incident.severity);
  return {
    id: createId('alert'),
    incidentId: incident.id,
    lane,
    channelId: notificationService.channelForSeverity(incident.severity),
    incidentType: incident.incidentType,
    severity: incident.severity,
    timestamp: incident.timestamp,
    createdAt: incident.createdAt,
    source: incident.source,
    notificationDelivered,
  };
}
