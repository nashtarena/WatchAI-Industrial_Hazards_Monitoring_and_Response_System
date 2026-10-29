import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

import { incidentTypeLabel } from '../constants/incidentTypes';
import { STORAGE_KEYS } from '../lib/config';
import { Incident } from '../types/incident';

/**
 * The voice alarm is an on-device alert mechanism built on the platform's
 * text-to-speech engine. It announces validated incident data only, it makes no
 * decisions, and it is always stoppable by the operator.
 */

const REPEAT_DELAY_MS = 1800;

let activeRunId = 0;
let repeatTimer: ReturnType<typeof setTimeout> | null = null;
let listener: ((speaking: boolean) => void) | null = null;

export function buildAnnouncement(incident: Incident): string {
  const severity = incident.severity === 'CRITICAL' ? 'Critical' : incident.severity.toLowerCase();
  return [
    `${severity} safety incident detected.`,
    `${incidentTypeLabel(incident.incidentType)} detected.`,
    'Immediate human verification required.',
  ].join(' ');
}

export function setAlarmStateListener(next: ((speaking: boolean) => void) | null): void {
  listener = next;
}

function clearTimer(): void {
  if (repeatTimer) {
    clearTimeout(repeatTimer);
    repeatTimer = null;
  }
}

/** Speaks the announcement on a loop until `stopAlarm` is called. */
export function startAlarm(incident: Incident): void {
  stopAlarm();

  activeRunId += 1;
  const runId = activeRunId;
  const text = buildAnnouncement(incident);
  listener?.(true);

  const speakOnce = () => {
    if (runId !== activeRunId) return;
    try {
      Speech.speak(text, {
        rate: 0.94,
        pitch: 1.05,
        onDone: () => {
          if (runId !== activeRunId) return;
          clearTimer();
          repeatTimer = setTimeout(speakOnce, REPEAT_DELAY_MS);
        },
        onStopped: () => {
          if (runId !== activeRunId) return;
          clearTimer();
        },
        onError: () => {
          // TTS is unavailable on this device: fail quietly, the visual alert stands.
          if (runId !== activeRunId) return;
          activeRunId += 1;
          listener?.(false);
        },
      });
    } catch {
      activeRunId += 1;
      listener?.(false);
    }
  };

  speakOnce();
}

export function stopAlarm(): void {
  activeRunId += 1;
  clearTimer();
  try {
    Speech.stop();
  } catch {
    // Nothing to stop.
  }
  listener?.(false);
}

export async function getVoiceAlarmPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.voiceAlarmEnabled);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

export async function setVoiceAlarmPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.voiceAlarmEnabled, enabled ? 'true' : 'false');
  } catch {
    // Non-fatal.
  }
}
