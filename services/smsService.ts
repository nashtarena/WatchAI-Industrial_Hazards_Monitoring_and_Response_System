import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';

import { incidentTypeLabel } from '../constants/incidentTypes';
import { DEFAULT_EMERGENCY_CONTACT, STORAGE_KEYS } from '../lib/config';
import { formatTimestamp } from '../lib/format';
import { Incident } from '../types/incident';

export type SmsOutcomeStatus = 'SENT' | 'CANCELLED' | 'UNKNOWN' | 'UNAVAILABLE' | 'ERROR';

export interface SmsOutcome {
  status: SmsOutcomeStatus;
  message: string;
}

/**
 * Builds the alert text. Only validated incident data is used - no location,
 * camera id or delivery claim is ever added.
 */
export function buildSafetyMessage(incident: Incident): string {
  const lines = [
    'WATCHAI SAFETY ALERT',
    '',
    `Incident: ${incidentTypeLabel(incident.incidentType)}`,
    `Severity: ${incident.severity}`,
    `Time: ${formatTimestamp(incident.timestamp)}`,
    '',
    'Description:',
    incident.description,
  ];

  if (incident.recommendedAction) {
    lines.push('', 'Recommended Action:', incident.recommendedAction);
  }

  if (incident.source === 'DEMO') {
    lines.push('', '[DEMO INCIDENT - simulated for demonstration]');
  }

  return lines.join('\n');
}

export async function isSmsAvailable(): Promise<boolean> {
  try {
    return await SMS.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getEmergencyContact(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.emergencyContact);
    if (stored && stored.trim().length > 0) return stored.trim();
  } catch {
    // Fall through to the configured default.
  }
  return DEFAULT_EMERGENCY_CONTACT;
}

/** Master switch for automatic, no-approval escalation. Defaults to on. */
export async function getAutoSmsPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.autoSmsEnabled);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

export async function setAutoSmsPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.autoSmsEnabled, enabled ? 'true' : 'false');
  } catch {
    // Non-fatal: the preference simply will not persist.
  }
}

export async function setEmergencyContact(contact: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.emergencyContact, contact.trim());
  } catch {
    // Non-fatal: the contact simply will not persist across restarts.
  }
}

/**
 * Opens the native SMS composer with the alert pre-filled.
 * The message is never sent silently - the operator taps send in their own SMS app,
 * so delivery is never claimed by WatchAI.
 */
export async function openIncidentSms(incident: Incident, contact?: string): Promise<SmsOutcome> {
  const available = await isSmsAvailable();
  if (!available) {
    return {
      status: 'UNAVAILABLE',
      message: 'SMS is not available on this device. Use another channel to escalate.',
    };
  }

  const recipient = (contact ?? (await getEmergencyContact())).trim();
  if (!recipient) {
    return {
      status: 'UNAVAILABLE',
      message: 'No emergency contact is configured. Set one in Profile.',
    };
  }

  try {
    const { result } = await SMS.sendSMSAsync([recipient], buildSafetyMessage(incident));
    if (result === 'sent') {
      return { status: 'SENT', message: 'The SMS composer was submitted from this device.' };
    }
    if (result === 'cancelled') {
      return { status: 'CANCELLED', message: 'SMS alert cancelled. No message was sent.' };
    }
    return {
      status: 'UNKNOWN',
      message: 'The SMS composer closed. Confirm in your messaging app whether it was sent.',
    };
  } catch {
    return { status: 'ERROR', message: 'The SMS composer could not be opened.' };
  }
}
