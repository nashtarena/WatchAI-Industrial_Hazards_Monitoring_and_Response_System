import {
  ALERT_API_TIMEOUT_MS,
  ALERT_API_TOKEN,
  ALERT_API_URL,
  isAutoSmsConfigured,
} from '../lib/config';
import { Incident } from '../types/incident';
import { AlertServiceHealth, SmsDispatchStatus } from '../types/notification';

/**
 * Talks to the WatchAI alert server, which owns the SMS provider credentials.
 *
 * The app posts validated incident fields only - the server composes the outgoing
 * message itself, so this endpoint cannot be used to send arbitrary text.
 */

export interface DispatchResult {
  status: SmsDispatchStatus;
  message: string;
  recipient: string | null;
  providerId: string | null;
}

function headers(): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ALERT_API_TOKEN) base['x-watchai-token'] = ALERT_API_TOKEN;
  return base;
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function isKnownStatus(value: unknown): value is SmsDispatchStatus {
  return value === 'SENT' || value === 'QUEUED' || value === 'DRY_RUN' || value === 'FAILED';
}

export async function dispatchSmsAlert(incident: Incident, contact: string): Promise<DispatchResult> {
  if (!isAutoSmsConfigured()) {
    return {
      status: 'FAILED',
      message: 'Automatic SMS is not configured. Set EXPO_PUBLIC_ALERT_API_URL in .env.',
      recipient: null,
      providerId: null,
    };
  }

  try {
    const response = await withTimeout(
      (signal) =>
        fetch(`${ALERT_API_URL}/api/alerts/sms`, {
          method: 'POST',
          signal,
          headers: headers(),
          body: JSON.stringify({
            incidentId: incident.id,
            incidentType: incident.incidentType,
            severity: incident.severity,
            timestamp: incident.timestamp,
            description: incident.description,
            recommendedAction: incident.recommendedAction,
            source: incident.source,
            contact,
          }),
        }),
      ALERT_API_TIMEOUT_MS,
    );

    const payload = (await response.json().catch(() => ({}))) as {
      status?: unknown;
      message?: unknown;
      recipient?: unknown;
      providerId?: unknown;
    };

    const message = typeof payload.message === 'string' ? payload.message : '';

    if (!response.ok) {
      return {
        status: 'FAILED',
        message: message || `The alert server rejected the request (HTTP ${response.status}).`,
        recipient: null,
        providerId: null,
      };
    }

    return {
      status: isKnownStatus(payload.status) ? payload.status : 'QUEUED',
      message: message || 'The alert server accepted the escalation.',
      recipient: typeof payload.recipient === 'string' ? payload.recipient : null,
      providerId: typeof payload.providerId === 'string' ? payload.providerId : null,
    };
  } catch (error) {
    const aborted = typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
    return {
      status: 'FAILED',
      message: aborted
        ? 'The alert server did not respond in time. Send the SMS manually.'
        : 'The alert server is unreachable. Check that it is running and that the app points at the right address.',
      recipient: null,
      providerId: null,
    };
  }
}

/** Used by Profile to confirm the escalation path works before a demo. */
export async function checkAlertService(): Promise<AlertServiceHealth> {
  if (!isAutoSmsConfigured()) {
    return {
      reachable: false,
      ready: false,
      provider: 'none',
      dryRun: false,
      message: 'No alert server configured. Set EXPO_PUBLIC_ALERT_API_URL in .env and restart Expo.',
    };
  }

  try {
    const response = await withTimeout(
      (signal) => fetch(`${ALERT_API_URL}/health`, { signal, headers: headers() }),
      ALERT_API_TIMEOUT_MS,
    );

    if (!response.ok) {
      return {
        reachable: true,
        ready: false,
        provider: 'unknown',
        dryRun: false,
        message: `The alert server replied with HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as {
      provider?: unknown;
      dryRun?: unknown;
      ready?: unknown;
      problems?: unknown;
    };

    const provider = typeof payload.provider === 'string' ? payload.provider : 'unknown';
    const dryRun = payload.dryRun === true;
    const ready = payload.ready === true;
    const problems = Array.isArray(payload.problems) ? payload.problems.filter((p) => typeof p === 'string') : [];

    return {
      reachable: true,
      ready,
      provider,
      dryRun,
      message: ready
        ? dryRun
          ? `Connected. Provider "${provider}" is in dry-run mode, so nothing is actually sent.`
          : `Connected. Provider "${provider}" is ready to send.`
        : `Connected, but not ready to send: ${problems.join(' ')}`,
    };
  } catch {
    return {
      reachable: false,
      ready: false,
      provider: 'unknown',
      dryRun: false,
      message: `Could not reach ${ALERT_API_URL}. On a physical device this must be your computer's LAN address, not localhost.`,
    };
  }
}
