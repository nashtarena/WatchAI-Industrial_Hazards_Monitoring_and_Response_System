import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { SEVERITY_RANK, Severity, isSeverity } from '../constants/incidentTypes';

/**
 * Client configuration.
 *
 * The Gemini key is read from an EXPO_PUBLIC_* env var, which means it is bundled
 * into the client. That is acceptable for a hackathon build only - treat the key as
 * a disposable development credential, never a production secret.
 */

export const GEMINI_API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '').trim();

/**
 * Google retires older Gemini models, and a retired name returns HTTP 404
 * ("no longer available to new users") rather than a helpful error. `gemini-flash-latest`
 * is an alias that always resolves to the current Flash model, so it cannot go stale.
 * Override it with EXPO_PUBLIC_GEMINI_MODEL to pin an exact version (e.g. gemini-3.6-flash)
 * when you want reproducible demo behaviour.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export const GEMINI_MODEL = (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? '').trim() || DEFAULT_GEMINI_MODEL;

export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const GEMINI_TIMEOUT_MS = 150_000;

/**
 * Inline video payloads are sent inside the request body, so the clip has to stay
 * well under the request-size ceiling once base64 encoded.
 */
export const MAX_VIDEO_BYTES = 18 * 1024 * 1024;

export const ALLOWED_VIDEO_MIME_PREFIX = 'video/';
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.3gp', '.mkv', '.webm', '.avi'];

/** Clearly marked placeholder. Never ship a real personal number. */
export const FALLBACK_EMERGENCY_CONTACT = '+910000000000';
export const EMERGENCY_CONTACT_LABEL = 'Safety Supervisor';

export const DEFAULT_EMERGENCY_CONTACT =
  (process.env.EXPO_PUBLIC_EMERGENCY_CONTACT ?? '').trim() || FALLBACK_EMERGENCY_CONTACT;

/**
 * Automatic SMS escalation.
 *
 * The mobile app never holds SMS provider credentials - it posts the validated incident
 * to the small WatchAI alert server, which sends the message. Leave the URL blank and the
 * app falls back to the manual native composer flow.
 */
export const DEFAULT_ALERT_PORT = 8787;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

/** Hand-rolled rather than using URL(), whose React Native polyfill is incomplete. */
const URL_PATTERN = /^(https?):\/\/([^/:?#]+)(?::(\d+))?/i;

/**
 * The dev server host, e.g. "10.10.48.113" from a hostUri of "10.10.48.113:8081".
 * Present only while running under the Expo CLI, which is exactly when the alert
 * server is on the same machine.
 */
function devServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split('/')[0].split(':')[0].trim();
  return host.length > 0 && !LOOPBACK_HOSTS.has(host) ? host : null;
}

interface ResolvedAlertApi {
  url: string;
  source: 'env' | 'derived' | 'none';
  warning: string | null;
}

/**
 * A hard-coded LAN IP goes stale every time DHCP hands out a new one, which is the
 * usual cause of "the alert server is unreachable". So: when the URL is blank we
 * derive it from the Expo dev server host, and when it points at loopback on a real
 * device - which can never reach the developer's machine - we substitute that host.
 */
function resolveAlertApi(): ResolvedAlertApi {
  const raw = (process.env.EXPO_PUBLIC_ALERT_API_URL ?? '').trim().replace(/\/+$/, '');
  const lanHost = devServerHost();

  if (!raw) {
    return lanHost
      ? { url: `http://${lanHost}:${DEFAULT_ALERT_PORT}`, source: 'derived', warning: null }
      : { url: '', source: 'none', warning: null };
  }

  const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`;
  const match = URL_PATTERN.exec(withScheme);

  if (!match) {
    return {
      url: '',
      source: 'none',
      warning: `EXPO_PUBLIC_ALERT_API_URL ("${raw}") is not a usable http(s) address.`,
    };
  }

  const [, scheme, host, port] = match;
  let resolvedHost = host;
  let warning: string | null = null;

  if (LOOPBACK_HOSTS.has(host) && Platform.OS !== 'web' && lanHost) {
    resolvedHost = lanHost;
    warning = `Rewrote ${host} to ${lanHost}: a device cannot reach the development machine's loopback address.`;
  }

  if (scheme.toLowerCase() === 'https') {
    warning =
      'EXPO_PUBLIC_ALERT_API_URL uses https, but the alert server speaks plain http. Use http:// unless you have put it behind TLS.';
  }

  return {
    url: `${scheme.toLowerCase()}://${resolvedHost}:${port || DEFAULT_ALERT_PORT}`,
    source: 'env',
    warning,
  };
}

const resolvedAlertApi = resolveAlertApi();

export const ALERT_API_URL = resolvedAlertApi.url;
/** Whether the address came from .env, was derived from the dev server, or is absent. */
export const ALERT_API_SOURCE = resolvedAlertApi.source;
/** Non-fatal configuration problem worth showing the operator. */
export const ALERT_API_WARNING = resolvedAlertApi.warning;

export const ALERT_API_TOKEN = (process.env.EXPO_PUBLIC_ALERT_API_TOKEN ?? '').trim();

export const ALERT_API_TIMEOUT_MS = 15_000;

/** Severities at or above this threshold escalate without human approval. */
export const AUTO_SMS_MIN_SEVERITY: Severity = isSeverity(
  (process.env.EXPO_PUBLIC_AUTO_SMS_MIN_SEVERITY ?? '').trim().toUpperCase(),
)
  ? ((process.env.EXPO_PUBLIC_AUTO_SMS_MIN_SEVERITY ?? '').trim().toUpperCase() as Severity)
  : 'CRITICAL';

export function isAutoSmsConfigured(): boolean {
  return ALERT_API_URL.length > 0;
}

export function isAutoSmsEligible(severity: Severity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[AUTO_SMS_MIN_SEVERITY];
}

export const STORAGE_KEYS = {
  biometricEnabled: 'watchai.biometricEnabled',
  session: 'watchai.session',
  lastEmail: 'watchai.lastEmail',
  emergencyContact: 'watchai.emergencyContact',
  voiceAlarmEnabled: 'watchai.voiceAlarmEnabled',
  autoSmsEnabled: 'watchai.autoSmsEnabled',
} as const;

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

export function isPlaceholderContact(contact: string): boolean {
  return contact.trim() === FALLBACK_EMERGENCY_CONTACT;
}
