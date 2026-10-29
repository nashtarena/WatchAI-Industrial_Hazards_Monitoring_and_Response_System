export const ROLES = {
  ADMIN: 'ADMIN',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  SUPERVISOR: 'SUPERVISOR',
  VIEWER: 'VIEWER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_ORDER: Role[] = [ROLES.ADMIN, ROLES.SAFETY_OFFICER, ROLES.SUPERVISOR, ROLES.VIEWER];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  SAFETY_OFFICER: 'Safety Officer',
  SUPERVISOR: 'Supervisor',
  VIEWER: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Full access to analysis, alerting and incident resolution.',
  SAFETY_OFFICER: 'Runs CCTV analysis, raises alerts and resolves incidents.',
  SUPERVISOR: 'Reviews and resolves incidents. Cannot analyse footage or send SMS.',
  VIEWER: 'Read-only access to the dashboard and incidents.',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLES, value);
}
