import { IncidentStatus, OPEN_STATUSES, SEVERITY_RANK, Severity } from '../constants/incidentTypes';
import { PERMISSIONS, Permission, can } from '../constants/permissions';
import { Role } from '../constants/roles';
import { Incident, IncidentAction } from '../types/incident';
import { AlertLane } from '../types/notification';

/** The only permitted status transitions. Everything else is rejected. */
const TRANSITIONS: Record<IncidentAction, { from: IncidentStatus; to: IncidentStatus }> = {
  ACKNOWLEDGE: { from: 'DETECTED', to: 'ACKNOWLEDGED' },
  REVIEW: { from: 'ACKNOWLEDGED', to: 'REVIEWED' },
  RESOLVE: { from: 'REVIEWED', to: 'RESOLVED' },
  REJECT: { from: 'DETECTED', to: 'REJECTED' },
};

export const ACTION_ORDER: IncidentAction[] = ['ACKNOWLEDGE', 'REVIEW', 'RESOLVE', 'REJECT'];

export const ACTION_LABELS: Record<IncidentAction, string> = {
  ACKNOWLEDGE: 'Acknowledge',
  REVIEW: 'Review',
  RESOLVE: 'Resolve',
  REJECT: 'Reject',
};

/** Which permission each human-review action requires. */
export const ACTION_PERMISSIONS: Record<IncidentAction, Permission> = {
  ACKNOWLEDGE: PERMISSIONS.REVIEW_INCIDENT,
  REVIEW: PERMISSIONS.REVIEW_INCIDENT,
  RESOLVE: PERMISSIONS.RESOLVE_INCIDENT,
  REJECT: PERMISSIONS.REVIEW_INCIDENT,
};

export function nextStatusFor(status: IncidentStatus, action: IncidentAction): IncidentStatus | null {
  const transition = TRANSITIONS[action];
  return transition.from === status ? transition.to : null;
}

export function isActionAllowed(
  status: IncidentStatus,
  action: IncidentAction,
  role: Role | null | undefined,
): boolean {
  return nextStatusFor(status, action) !== null && can(role, ACTION_PERMISSIONS[action]);
}

export function allowedActions(status: IncidentStatus, role: Role | null | undefined): IncidentAction[] {
  return ACTION_ORDER.filter((action) => isActionAllowed(status, action, role));
}

/** SMS escalation is offered for the severities that warrant it. */
export function canEscalateBySms(incident: Incident, role: Role | null | undefined): boolean {
  const escalatable = incident.severity === 'CRITICAL' || incident.severity === 'HIGH';
  return escalatable && can(role, PERMISSIONS.SEND_SMS);
}

export function laneForSeverity(severity: Severity): AlertLane {
  switch (severity) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    default:
      return 'GENERAL';
  }
}

export interface IncidentStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  pendingReview: number;
  resolved: number;
  rejected: number;
}

/** Counters are always derived from the live local incident array. */
export function computeStats(incidents: Incident[]): IncidentStats {
  return incidents.reduce<IncidentStats>(
    (stats, incident) => {
      stats.total += 1;
      if (incident.severity === 'CRITICAL') stats.critical += 1;
      if (incident.severity === 'HIGH') stats.high += 1;
      if (incident.severity === 'MEDIUM') stats.medium += 1;
      if (incident.severity === 'LOW') stats.low += 1;
      if (OPEN_STATUSES.includes(incident.status)) stats.pendingReview += 1;
      if (incident.status === 'RESOLVED') stats.resolved += 1;
      if (incident.status === 'REJECTED') stats.rejected += 1;
      return stats;
    },
    {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      pendingReview: 0,
      resolved: 0,
      rejected: 0,
    },
  );
}

export function sortByNewest(incidents: Incident[]): Incident[] {
  return [...incidents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function sortBySeverityDesc(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}
