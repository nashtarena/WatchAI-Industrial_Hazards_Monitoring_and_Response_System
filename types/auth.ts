import { Role } from '../constants/roles';

/** A hard-coded demo credential. There is no backend and no user database. */
export interface DemoAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  department: string;
}

/** The signed-in user held in memory (never contains the password). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
}

export interface PersistedSession {
  userId: string;
  signedInAt: string;
}

export type BiometricFailureReason =
  | 'HARDWARE_UNAVAILABLE'
  | 'NOT_ENROLLED'
  | 'CANCELLED'
  | 'FAILED'
  | 'UNKNOWN';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  available: boolean;
  methodLabel: string;
  unavailableReason: string | null;
}

export interface BiometricAuthResult {
  success: boolean;
  reason: BiometricFailureReason | 'SUCCESS';
  message: string;
}
