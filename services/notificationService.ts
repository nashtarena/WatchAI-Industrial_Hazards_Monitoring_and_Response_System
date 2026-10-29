import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Severity } from '../constants/incidentTypes';
import { formatConfidence } from '../lib/format';
import { Incident } from '../types/incident';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannelId,
  NotificationPermissionState,
} from '../types/notification';

let handlerConfigured = false;
let channelsConfigured = false;

/** Foreground presentation. Called once from the root layout. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function channelForSeverity(severity: Severity): NotificationChannelId {
  switch (severity) {
    case 'CRITICAL':
      return NOTIFICATION_CHANNELS.CRITICAL;
    case 'HIGH':
      return NOTIFICATION_CHANNELS.HIGH;
    case 'MEDIUM':
      return NOTIFICATION_CHANNELS.MEDIUM;
    default:
      return NOTIFICATION_CHANNELS.GENERAL;
  }
}

export async function setupChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelsConfigured) return;

  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.CRITICAL, {
      name: 'Critical safety incidents',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400, 200, 600],
      lightColor: '#FF3B3B',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.HIGH, {
      name: 'High-risk safety incidents',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#FF7A1A',
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MEDIUM, {
      name: 'Safety violations',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 200],
      lightColor: '#F0B429',
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.GENERAL, {
      name: 'General safety activity',
      importance: Notifications.AndroidImportance.LOW,
      lightColor: '#00A6F5',
    });
    channelsConfigured = true;
  } catch {
    // Channel setup is best-effort: a failure must never break the app.
  }
}

function toPermissionState(status: Notifications.PermissionStatus): NotificationPermissionState {
  if (status === 'granted') return 'GRANTED';
  if (status === 'denied') return 'DENIED';
  return 'UNDETERMINED';
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return toPermissionState(status);
  } catch {
    return 'UNDETERMINED';
  }
}

export async function requestPermissions(): Promise<NotificationPermissionState> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') {
      await setupChannels();
      return 'GRANTED';
    }
    const next = await Notifications.requestPermissionsAsync();
    if (next.status === 'granted') {
      await setupChannels();
    }
    return toPermissionState(next.status);
  } catch {
    return 'UNDETERMINED';
  }
}

interface PresentOptions {
  title: string;
  body: string;
  channelId: NotificationChannelId;
  critical: boolean;
  data?: Record<string, string>;
}

async function present(options: PresentOptions): Promise<boolean> {
  try {
    const permission = await getPermissionState();
    if (permission !== 'GRANTED') return false;
    await setupChannels();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        sound: 'default',
        vibrate: options.critical ? [0, 400, 200, 400, 200, 600] : undefined,
        priority: options.critical
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
        interruptionLevel: options.critical ? 'critical' : 'active',
        data: options.data ?? {},
      },
      trigger: Platform.OS === 'android' ? { channelId: options.channelId } : null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Raises the local notification for an incident.
 * LOW severity is displayed in-app only and deliberately does not notify.
 */
export async function notifyIncident(incident: Incident): Promise<boolean> {
  if (incident.severity === 'LOW') return false;

  const isCritical = incident.severity === 'CRITICAL';
  const title = isCritical ? 'CRITICAL SAFETY INCIDENT' : `${incident.severity} SAFETY INCIDENT`;
  const details = [
    incident.timestamp ? `Timestamp: ${incident.timestamp}` : null,
    `Confidence: ${formatConfidence(incident.confidence)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return present({
    title: incident.source === 'DEMO' ? `${title} (DEMO)` : title,
    body: `${incident.description}\n${details}`,
    channelId: channelForSeverity(incident.severity),
    critical: isCritical,
    data: { incidentId: incident.id },
  });
}

/** Demo/dev helper so notifications can be shown without running an analysis. */
export async function sendTestCriticalNotification(): Promise<boolean> {
  return present({
    title: 'CRITICAL SAFETY INCIDENT (TEST)',
    body: 'This is a WatchAI notification test. No incident was detected.',
    channelId: NOTIFICATION_CHANNELS.CRITICAL,
    critical: true,
    data: { test: 'true' },
  });
}

export function addNotificationTapListener(
  handler: (incidentId: string | null) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | null;
    const incidentId = data && typeof data.incidentId === 'string' ? data.incidentId : null;
    handler(incidentId);
  });
}
