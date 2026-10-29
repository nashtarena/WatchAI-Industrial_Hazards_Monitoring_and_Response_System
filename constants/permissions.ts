import { ROLES, Role } from './roles';

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  UPLOAD_VIDEO: 'UPLOAD_VIDEO',
  ANALYZE_VIDEO: 'ANALYZE_VIDEO',
  VIEW_INCIDENT: 'VIEW_INCIDENT',
  SEND_SMS: 'SEND_SMS',
  REVIEW_INCIDENT: 'REVIEW_INCIDENT',
  RESOLVE_INCIDENT: 'RESOLVE_INCIDENT',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Record<Permission, string> = {
  VIEW_DASHBOARD: 'View dashboard',
  UPLOAD_VIDEO: 'Select CCTV video',
  ANALYZE_VIDEO: 'Run AI safety analysis',
  VIEW_INCIDENT: 'View incidents',
  SEND_SMS: 'Send SMS safety alert',
  REVIEW_INCIDENT: 'Acknowledge / review / reject',
  RESOLVE_INCIDENT: 'Resolve incidents',
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.UPLOAD_VIDEO,
    PERMISSIONS.ANALYZE_VIDEO,
    PERMISSIONS.VIEW_INCIDENT,
    PERMISSIONS.SEND_SMS,
    PERMISSIONS.REVIEW_INCIDENT,
    PERMISSIONS.RESOLVE_INCIDENT,
  ],
  [ROLES.SAFETY_OFFICER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.UPLOAD_VIDEO,
    PERMISSIONS.ANALYZE_VIDEO,
    PERMISSIONS.VIEW_INCIDENT,
    PERMISSIONS.SEND_SMS,
    PERMISSIONS.REVIEW_INCIDENT,
    PERMISSIONS.RESOLVE_INCIDENT,
  ],
  [ROLES.SUPERVISOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INCIDENT,
    PERMISSIONS.REVIEW_INCIDENT,
    PERMISSIONS.RESOLVE_INCIDENT,
  ],
  [ROLES.VIEWER]: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_INCIDENT],
};

/**
 * Single source of truth for every role check in the app.
 */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  return granted.includes(permission);
}

export function canAny(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function permissionsFor(role: Role | null | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}
