export const INCIDENT_TYPES = [
  'WORKER_FALL',
  'FIRE',
  'SMOKE',
  'MISSING_PPE',
  'UNAUTHORIZED_ENTRY',
  'RESTRICTED_ZONE_ENTRY',
  'DANGEROUS_MACHINE_PROXIMITY',
  'COLLISION',
  'OTHER_SAFETY_HAZARD',
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  WORKER_FALL: 'Worker Fall',
  FIRE: 'Fire',
  SMOKE: 'Smoke',
  MISSING_PPE: 'Missing PPE',
  UNAUTHORIZED_ENTRY: 'Unauthorized Entry',
  RESTRICTED_ZONE_ENTRY: 'Restricted Zone Entry',
  DANGEROUS_MACHINE_PROXIMITY: 'Dangerous Machine Proximity',
  COLLISION: 'Collision',
  OTHER_SAFETY_HAZARD: 'Other Safety Hazard',
};

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_RANK: Record<Severity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const INCIDENT_STATUSES = ['DETECTED', 'ACKNOWLEDGED', 'REVIEWED', 'RESOLVED', 'REJECTED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  DETECTED: 'Detected',
  ACKNOWLEDGED: 'Acknowledged',
  REVIEWED: 'Reviewed',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const ANALYSIS_STATUSES = ['SUCCESS', 'NO_INCIDENT', 'UNCERTAIN', 'FAILED'] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

/** Statuses that still require a human to close the loop. */
export const OPEN_STATUSES: IncidentStatus[] = ['DETECTED', 'ACKNOWLEDGED', 'REVIEWED'];

export function isIncidentType(value: unknown): value is IncidentType {
  return typeof value === 'string' && (INCIDENT_TYPES as readonly string[]).includes(value);
}

export function isSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);
}

export function isAnalysisStatus(value: unknown): value is AnalysisStatus {
  return typeof value === 'string' && (ANALYSIS_STATUSES as readonly string[]).includes(value);
}

export function incidentTypeLabel(type: IncidentType | string): string {
  return isIncidentType(type) ? INCIDENT_TYPE_LABELS[type] : 'Safety Hazard';
}
