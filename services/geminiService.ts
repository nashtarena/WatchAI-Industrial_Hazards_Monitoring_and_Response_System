import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  AnalysisStatus,
  isAnalysisStatus,
  isIncidentType,
  isSeverity,
} from '../constants/incidentTypes';
import {
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_MIME_PREFIX,
  GEMINI_API_KEY,
  GEMINI_ENDPOINT,
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  MAX_VIDEO_BYTES,
  isGeminiConfigured,
} from '../lib/config';
import { createId, formatBytes } from '../lib/format';
import { AnalysisResult, BoundingBox, Incident } from '../types/incident';
import { AnalysisStage, SelectedVideo } from '../types/video';

/**
 * The system instruction handed to Gemini for every analysis. Kept verbatim so the
 * model's contract and the local validator below stay in sync.
 */
export const WATCHAI_SYSTEM_PROMPT = `You are WatchAI Safety Intelligence, an industrial CCTV safety-analysis system.

Your task is to analyze submitted CCTV video footage and identify ONLY safety incidents that are visually supported by the footage.

You are not a general conversational assistant.

You are an industrial safety video analyst.

CORE RULES:

1. Analyze only the actual visual content of the supplied video.
2. Never invent an incident.
3. Never assume an unsafe event occurred merely because it is possible.
4. Do not infer information that cannot reasonably be supported by visible evidence.
5. Distinguish genuine safety incidents from normal workplace activity.
6. If evidence is insufficient, mark the event as UNCERTAIN.
7. Pay particular attention to worker falls, fire, smoke, missing PPE, unauthorized entry, restricted-zone entry, dangerous proximity to machinery, collisions, and other clearly visible safety hazards.
8. Identify every distinct safety incident visible in the video.
9. Do not duplicate the same incident.
10. Provide the approximate timestamp of each incident.
11. Provide a concise factual description.
12. Provide the visible evidence supporting the classification.
13. Provide a confidence score from 0.0 to 1.0.
14. Assign severity as LOW, MEDIUM, HIGH, or CRITICAL.
15. Severity must reflect the visible potential safety consequence.
16. Confidence must reflect how clearly the footage supports the conclusion.
17. If no safety incident is visible, return NO_INCIDENT.
18. If the video cannot be reliably analyzed, return FAILED.
19. Never invent a timestamp.
20. Never invent a location.
21. Never invent a camera identifier.
22. Never identify a person's name from appearance.
23. Never make medical diagnoses.
24. Never claim emergency services were contacted.
25. Never claim an SMS was sent.
26. Never claim an alert was delivered.
27. You are responsible for video analysis and safety recommendations only.
28. Return ONLY valid JSON.
29. Do not use markdown.
30. Do not include text outside the JSON.
31. Localise each incident with a 2D bounding box around the anomalous region.
32. Report the box as "box_2d": [ymin, xmin, ymax, xmax], normalised to 0-1000 relative to the full video frame, where [0,0] is the top-left corner.
33. The box must describe the frame at the reported timestamp, and must tightly enclose the person, object or area that makes the scene unsafe.
34. Never invent a bounding box. If you cannot localise the incident in the frame, set "box_2d" to null.

INCIDENT TYPES:

WORKER_FALL
FIRE
SMOKE
MISSING_PPE
UNAUTHORIZED_ENTRY
RESTRICTED_ZONE_ENTRY
DANGEROUS_MACHINE_PROXIMITY
COLLISION
OTHER_SAFETY_HAZARD

SEVERITY:

LOW:
Minor safety concern with no immediate danger visible.

MEDIUM:
Meaningful safety violation or hazardous condition requiring attention.

HIGH:
Serious safety incident requiring immediate human attention.

CRITICAL:
Clearly visible immediate and potentially severe threat to human life or major industrial safety.

OUTPUT:

Return exactly:

{
  "analysis_status": "SUCCESS | NO_INCIDENT | UNCERTAIN | FAILED",
  "summary": "Short factual summary",
  "incidents": [
    {
      "incident_type": "WORKER_FALL | FIRE | SMOKE | MISSING_PPE | UNAUTHORIZED_ENTRY | RESTRICTED_ZONE_ENTRY | DANGEROUS_MACHINE_PROXIMITY | COLLISION | OTHER_SAFETY_HAZARD",
      "timestamp": "MM:SS",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "confidence": 0.0,
      "description": "What is visibly happening",
      "evidence": "Specific visible evidence",
      "recommended_action": "Immediate practical safety action",
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}

If there is no incident:

{
  "analysis_status": "NO_INCIDENT",
  "summary": "No clearly visible safety incident was detected.",
  "incidents": []
}

If analysis fails:

{
  "analysis_status": "FAILED",
  "summary": "The footage could not be analyzed reliably.",
  "incidents": []
}

Return JSON only.`;

const USER_PROMPT =
  'Analyze this CCTV footage for industrial safety incidents and return only the JSON object defined in your instructions.';

export type AnalysisFailureCode =
  | 'NOT_CONFIGURED'
  | 'FILE_MISSING'
  | 'UNSUPPORTED_TYPE'
  | 'TOO_LARGE'
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'AUTH'
  | 'MODEL_UNAVAILABLE'
  | 'SERVER'
  | 'INVALID_RESPONSE'
  | 'MODEL_FAILED'
  | 'UNKNOWN';

export interface AnalysisFailure {
  ok: false;
  code: AnalysisFailureCode;
  message: string;
  /** Present when the model itself reported FAILED and gave a reason. */
  modelSummary?: string;
}

export type AnalysisOutcome = { ok: true; result: AnalysisResult } | AnalysisFailure;

interface AnalyzeOptions {
  onStage?: (stage: AnalysisStage) => void;
}

const TIMESTAMP_PATTERN = /^(\d{1,3}):([0-5]\d)$/;

// ---------------------------------------------------------------------------
// Video validation and preparation
// ---------------------------------------------------------------------------

export function isSupportedVideo(name: string, mimeType: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith(ALLOWED_VIDEO_MIME_PREFIX)) return true;
  const lower = name.toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function validateVideo(video: SelectedVideo): AnalysisFailure | null {
  if (!isSupportedVideo(video.name, video.mimeType)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_TYPE',
      message: 'That file is not a supported video. Select an MP4 or MOV clip.',
    };
  }
  if (video.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      code: 'TOO_LARGE',
      message: `This clip is ${formatBytes(video.size)}. On-device analysis supports clips up to ${formatBytes(
        MAX_VIDEO_BYTES,
      )} - select a shorter segment.`,
    };
  }
  return null;
}

/** Reads the clip into a base64 payload for the inline Gemini request. */
async function prepareVideo(video: SelectedVideo): Promise<
  { ok: true; base64: string; mimeType: string } | AnalysisFailure
> {
  try {
    // On web the picker hands back a blob: URL, which the filesystem module cannot see.
    if (Platform.OS === 'web') {
      return prepareVideoOnWeb(video);
    }

    const file = new File(video.uri);
    if (!file.exists) {
      return {
        ok: false,
        code: 'FILE_MISSING',
        message: 'The selected video is no longer available. Select it again.',
      };
    }

    const size = file.size || video.size;
    if (size > MAX_VIDEO_BYTES) {
      return {
        ok: false,
        code: 'TOO_LARGE',
        message: `This clip is ${formatBytes(size)}. On-device analysis supports clips up to ${formatBytes(
          MAX_VIDEO_BYTES,
        )} - select a shorter segment.`,
      };
    }

    const base64 = await file.base64();
    if (!base64) {
      return {
        ok: false,
        code: 'FILE_MISSING',
        message: 'The video could not be read from storage. Try selecting it again.',
      };
    }

    const mimeType = video.mimeType || file.type || 'video/mp4';
    return { ok: true, base64, mimeType };
  } catch {
    return {
      ok: false,
      code: 'FILE_MISSING',
      message: 'The video could not be read from storage. Try selecting it again.',
    };
  }
}

/** Web path: read the picked blob straight out of the browser. */
async function prepareVideoOnWeb(
  video: SelectedVideo,
): Promise<{ ok: true; base64: string; mimeType: string } | AnalysisFailure> {
  try {
    const response = await fetch(video.uri);
    const blob = await response.blob();

    if (blob.size === 0) {
      return {
        ok: false,
        code: 'FILE_MISSING',
        message: 'The selected video could not be read. Select it again.',
      };
    }
    if (blob.size > MAX_VIDEO_BYTES) {
      return {
        ok: false,
        code: 'TOO_LARGE',
        message: `This clip is ${formatBytes(blob.size)}. Analysis supports clips up to ${formatBytes(
          MAX_VIDEO_BYTES,
        )} - select a shorter segment.`,
      };
    }

    const base64 = await blobToBase64(blob);
    if (!base64) {
      return {
        ok: false,
        code: 'FILE_MISSING',
        message: 'The selected video could not be read. Select it again.',
      };
    }

    return { ok: true, base64, mimeType: blob.type || video.mimeType || 'video/mp4' };
  } catch {
    return {
      ok: false,
      code: 'FILE_MISSING',
      message: 'The selected video could not be read. Select it again.',
    };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The video could not be read.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const separator = result.indexOf(',');
      resolve(separator > -1 ? result.slice(separator + 1) : '');
    };
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Gemini request
// ---------------------------------------------------------------------------

interface RequestSuccess {
  ok: true;
  text: string;
}

async function requestAnalysis(base64: string, mimeType: string): Promise<RequestSuccess | AnalysisFailure> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: WATCHAI_SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType, data: base64 } }, { text: USER_PROMPT }],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return mapHttpFailure(response.status, await readApiError(response));
    }

    const payload = (await response.json()) as unknown;
    const text = extractText(payload);
    if (!text) {
      return {
        ok: false,
        code: 'INVALID_RESPONSE',
        message: 'Gemini returned an empty response.',
      };
    }
    return { ok: true, text };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        ok: false,
        code: 'TIMEOUT',
        message: 'Gemini did not respond in time. Try a shorter clip.',
      };
    }
    return {
      ok: false,
      code: 'OFFLINE',
      message: 'AI analysis requires an internet connection.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

/** Reads the API's own error text so a failure is diagnosable, never a bare status code. */
async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.text();
    if (!body) return '';
    try {
      const parsed = JSON.parse(body) as { error?: { message?: unknown } };
      const message = parsed.error?.message;
      if (typeof message === 'string') return message.trim();
    } catch {
      // Not JSON - fall through to the raw body.
    }
    return body.slice(0, 300).trim();
  } catch {
    return '';
  }
}

function withDetail(message: string, detail: string): string {
  return detail ? `${message}\n\nGemini said: ${detail}` : message;
}

function mapHttpFailure(status: number, detail = ''): AnalysisFailure {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      code: 'AUTH',
      message: withDetail('The Gemini API key was rejected. Check EXPO_PUBLIC_GEMINI_API_KEY.', detail),
    };
  }
  // 404 means the model name is wrong or has been retired by Google.
  if (status === 404) {
    return {
      ok: false,
      code: 'MODEL_UNAVAILABLE',
      message: withDetail(
        `The model "${GEMINI_MODEL}" is not available to this API key. Set EXPO_PUBLIC_GEMINI_MODEL in .env to a current model and restart Expo.`,
        detail,
      ),
    };
  }
  if (status === 429) {
    return {
      ok: false,
      code: 'RATE_LIMIT',
      message: 'Gemini rate limit reached. Wait a moment and analyse again.',
    };
  }
  if (status === 413) {
    return {
      ok: false,
      code: 'TOO_LARGE',
      message: 'Gemini rejected the clip as too large. Select a shorter segment.',
    };
  }
  if (status >= 500) {
    return {
      ok: false,
      code: 'SERVER',
      message: 'Gemini is temporarily unavailable. Try again shortly.',
    };
  }
  return {
    ok: false,
    code: 'UNKNOWN',
    message: withDetail(`Gemini rejected the request (HTTP ${status}).`, detail),
  };
}

function extractText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return '';
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : ''))
    .join('')
    .trim();
}

// ---------------------------------------------------------------------------
// Parsing + local validation. Gemini output is never trusted as-is.
// ---------------------------------------------------------------------------

function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function stripCodeFence(text: string): string {
  let value = text.trim();
  if (value.startsWith('```')) {
    value = value.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }
  // Guard against any stray prose around the object.
  const first = value.indexOf('{');
  const last = value.lastIndexOf('}');
  if (first > 0 || (last > -1 && last < value.length - 1)) {
    if (first > -1 && last > first) {
      value = value.slice(first, last + 1);
    }
  }
  return value;
}

interface ValidatedPayload {
  analysisStatus: AnalysisStatus;
  summary: string;
  incidents: Incident[];
  droppedIncidents: number;
}

/** Coerces `0:14` to `00:14`; returns '' when nothing usable was supplied. */
function normalizeTimestamp(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = TIMESTAMP_PATTERN.exec(value.trim());
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/** Accepts 0.0-1.0, and treats a 1-100 value as a percentage. Anything else is rejected. */
function normalizeConfidence(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 0 && numeric <= 1) return numeric;
  if (numeric > 1 && numeric <= 100) return numeric / 100;
  return null;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Converts Gemini's `box_2d` - [ymin, xmin, ymax, xmax] normalised to 0-1000 - into
 * fractions of the frame. Returns null for anything malformed, degenerate or out of
 * range, so a bad box is dropped rather than drawn in the wrong place.
 */
function normalizeBoundingBox(value: unknown): BoundingBox | null {
  if (!Array.isArray(value) || value.length !== 4) return null;

  const numbers = value.map((entry) => (typeof entry === 'number' ? entry : Number(entry)));
  if (numbers.some((entry) => !Number.isFinite(entry))) return null;

  // Some responses come back already normalised to 0-1 instead of 0-1000.
  const scale = numbers.every((entry) => entry >= 0 && entry <= 1) ? 1 : 1000;
  const [top, left, bottom, right] = numbers.map((entry) => entry / scale);

  if ([top, left, bottom, right].some((entry) => entry < 0 || entry > 1)) return null;
  if (right <= left || bottom <= top) return null;

  const box: BoundingBox = { x: left, y: top, width: right - left, height: bottom - top };

  // A box covering essentially the whole frame localises nothing useful.
  if (box.width >= 0.995 && box.height >= 0.995) return null;
  return box;
}

function validatePayload(
  raw: Record<string, unknown>,
  videoName: string,
  videoUri: string,
): { ok: true; value: ValidatedPayload } | { ok: false; reason: string } {
  const analysisStatus = raw.analysis_status;
  if (!isAnalysisStatus(analysisStatus)) {
    return { ok: false, reason: 'analysis_status was missing or not recognised.' };
  }

  const summary = asText(raw.summary);
  if (!summary) {
    return { ok: false, reason: 'summary was missing.' };
  }

  const rawIncidents = raw.incidents;
  if (rawIncidents !== undefined && !Array.isArray(rawIncidents)) {
    return { ok: false, reason: 'incidents was not an array.' };
  }

  const list = Array.isArray(rawIncidents) ? rawIncidents : [];
  const incidents: Incident[] = [];
  let dropped = 0;

  for (const entry of list) {
    if (typeof entry !== 'object' || entry === null) {
      dropped += 1;
      continue;
    }
    const record = entry as Record<string, unknown>;
    const incidentType = record.incident_type;
    const severity = record.severity;
    const confidence = normalizeConfidence(record.confidence);
    const description = asText(record.description);

    if (!isIncidentType(incidentType) || !isSeverity(severity) || confidence === null || !description) {
      dropped += 1;
      continue;
    }

    incidents.push({
      id: createId('inc'),
      incidentType,
      severity,
      confidence,
      description,
      timestamp: normalizeTimestamp(record.timestamp),
      evidence: asText(record.evidence),
      recommendedAction: asText(record.recommended_action),
      status: 'DETECTED',
      createdAt: new Date().toISOString(),
      source: 'GEMINI',
      videoName,
      videoUri,
      region: normalizeBoundingBox(record.box_2d),
    });
  }

  if (analysisStatus === 'SUCCESS' && incidents.length === 0) {
    return { ok: false, reason: 'The model reported SUCCESS but returned no usable incident.' };
  }

  return {
    ok: true,
    value: { analysisStatus, summary, incidents, droppedIncidents: dropped },
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs one analysis pass: prepare -> request -> parse -> validate -> normalize.
 * A single retry is attempted for transient failures and unusable model output.
 */
export async function analyzeVideo(
  video: SelectedVideo,
  options: AnalyzeOptions = {},
): Promise<AnalysisOutcome> {
  const report = (stage: AnalysisStage) => options.onStage?.(stage);

  if (!isGeminiConfigured()) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      message: 'No Gemini API key found. Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart Expo.',
    };
  }

  const staticFailure = validateVideo(video);
  if (staticFailure) return staticFailure;

  report('PREPARING');
  const prepared = await prepareVideo(video);
  if (!prepared.ok) return prepared;

  let lastFailure: AnalysisFailure = {
    ok: false,
    code: 'UNKNOWN',
    message: 'The analysis could not be completed.',
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    report('UPLOADING');
    const response = await requestAnalysis(prepared.base64, prepared.mimeType);

    if (!response.ok) {
      lastFailure = response;
      if (!isRetryable(response.code)) return response;
      continue;
    }

    report('ANALYZING');
    const parsed = parseJson(response.text);
    if (!parsed) {
      lastFailure = {
        ok: false,
        code: 'INVALID_RESPONSE',
        message: 'Gemini returned a response that was not valid JSON.',
      };
      continue;
    }

    report('VALIDATING');
    const validated = validatePayload(parsed, video.name, video.uri);
    if (!validated.ok) {
      lastFailure = {
        ok: false,
        code: 'INVALID_RESPONSE',
        message: `The analysis result failed local validation: ${validated.reason}`,
      };
      continue;
    }

    if (validated.value.analysisStatus === 'FAILED') {
      return {
        ok: false,
        code: 'MODEL_FAILED',
        message: 'The footage could not be analyzed reliably.',
        modelSummary: validated.value.summary,
      };
    }

    report('SAVING');
    return {
      ok: true,
      result: {
        id: createId('analysis'),
        analysisStatus: validated.value.analysisStatus,
        summary: validated.value.summary,
        incidents: validated.value.incidents,
        droppedIncidents: validated.value.droppedIncidents,
        videoName: video.name,
        videoUri: video.uri,
        createdAt: new Date().toISOString(),
        source: 'GEMINI',
      },
    };
  }

  return lastFailure;
}

/** A timeout is not retried - a second 150s wait would strand the operator. */
function isRetryable(code: AnalysisFailureCode): boolean {
  return code === 'SERVER' || code === 'INVALID_RESPONSE' || code === 'UNKNOWN';
}
