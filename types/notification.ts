import { IncidentType, Severity } from '../constants/incidentTypes';
import { IncidentSource } from './incident';

export const NOTIFICATION_CHANNELS = {
  CRITICAL: 'watchai-critical',
  HIGH: 'watchai-high',
  MEDIUM: 'watchai-medium',
  GENERAL: 'watchai-general',
} as const;

export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

export const ALERT_LANES = ['CRITICAL', 'HIGH', 'MEDIUM', 'GENERAL'] as const;
export type AlertLane = (typeof ALERT_LANES)[number];

export const ALERT_LANE_LABELS: Record<AlertLane, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  GENERAL: 'General',
};

/** A record of an alert raised locally for an incident. */
export interface Alert {
  id: string;
  incidentId: string;
  lane: AlertLane;
  channelId: NotificationChannelId;
  /** Snapshot fields so the alert renders even if the incident is filtered out. */
  incidentType: IncidentType;
  severity: Severity;
  timestamp: string;
  createdAt: string;
  source: IncidentSource;
  notificationDelivered: boolean;
}

export type NotificationPermissionState = 'UNDETERMINED' | 'GRANTED' | 'DENIED';

export type SmsDispatchStatus = 'PENDING' | 'SENT' | 'QUEUED' | 'DRY_RUN' | 'FAILED';

/** Result of asking the alert server to send an SMS for an incident. */
export interface SmsDispatch {
  incidentId: string;
  status: SmsDispatchStatus;
  message: string;
  /** Masked by the server, for example +91***210. */
  recipient: string | null;
  providerId: string | null;
  at: string;
  /** false when a human pressed retry rather than the workflow firing it. */
  automatic: boolean;
}

export interface AlertServiceHealth {
  reachable: boolean;
  ready: boolean;
  provider: string;
  dryRun: boolean;
  message: string;
}
