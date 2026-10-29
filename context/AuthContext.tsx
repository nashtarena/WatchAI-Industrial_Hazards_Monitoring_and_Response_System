import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { DEMO_ACCOUNTS } from '../constants/demoData';
import { Role } from '../constants/roles';
import { STORAGE_KEYS } from '../lib/config';
import * as biometricService from '../services/biometricService';
import { AuthUser, BiometricAuthResult, BiometricCapabilities, PersistedSession } from '../types/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  /** Signed in and unlocked. Only then may app screens render. */
  isAuthenticated: boolean;
  /** A stored demo session exists, but biometric unlock is still pending. */
  isLocked: boolean;
  isBootstrapping: boolean;
  isSigningIn: boolean;
  signInError: string | null;
  biometricEnabled: boolean;
  biometricCapabilities: BiometricCapabilities | null;
  lastEmail: string;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  enableBiometrics: () => Promise<BiometricAuthResult>;
  disableBiometrics: () => Promise<void>;
  unlockWithBiometrics: () => Promise<BiometricAuthResult>;
  /** Biometric fallback: drop the locked session and return to demo login. */
  fallbackToLogin: () => Promise<void>;
  refreshBiometricCapabilities: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(accountId: string): AuthUser | null {
  const account = DEMO_ACCOUNTS.find((item) => item.id === accountId);
  if (!account) return null;
  const { password: _password, ...safe } = account;
  return safe;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [lastEmail, setLastEmail] = useState('');

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const [enabled, capabilities] = await Promise.all([
        biometricService.getBiometricPreference(),
        biometricService.getCapabilities(),
      ]);

      let restored: AuthUser | null = null;
      let storedEmail = '';

      try {
        const [rawSession, rawEmail] = await AsyncStorage.multiGet([
          STORAGE_KEYS.session,
          STORAGE_KEYS.lastEmail,
        ]);
        storedEmail = rawEmail[1] ?? '';
        if (rawSession[1]) {
          const session = JSON.parse(rawSession[1]) as PersistedSession;
          restored = toAuthUser(session.userId);
        }
      } catch {
        restored = null;
      }

      if (cancelled) return;
      setBiometricEnabled(enabled);
      setBiometricCapabilities(capabilities);
      setLastEmail(storedEmail);
      setUser(restored);
      // A restored session behind an enabled biometric lock must be unlocked first.
      setIsLocked(Boolean(restored) && enabled && capabilities.available);
      setIsBootstrapping(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsSigningIn(true);
    setSignInError(null);

    // Small deliberate delay so the "Signing in..." state is visible.
    await new Promise((resolve) => setTimeout(resolve, 350));

    const normalized = email.trim().toLowerCase();
    const account = DEMO_ACCOUNTS.find(
      (item) => item.email.toLowerCase() === normalized && item.password === password,
    );

    if (!account) {
      setSignInError('Invalid email or password. Use one of the demo accounts below.');
      setIsSigningIn(false);
      return false;
    }

    const { password: _password, ...safeUser } = account;
    setUser(safeUser);
    setIsLocked(false);
    setIsSigningIn(false);

    try {
      const session: PersistedSession = { userId: account.id, signedInAt: new Date().toISOString() };
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.session, JSON.stringify(session)],
        [STORAGE_KEYS.lastEmail, account.email],
      ]);
      setLastEmail(account.email);
    } catch {
      // The in-memory session still works; it just will not survive a restart.
    }

    return true;
  }, []);

  const clearSession = useCallback(async () => {
    setUser(null);
    setIsLocked(false);
    setSignInError(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.session);
    } catch {
      // Nothing else to do.
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const fallbackToLogin = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const enableBiometrics = useCallback(async () => {
    const capabilities = await biometricService.getCapabilities();
    setBiometricCapabilities(capabilities);

    if (!capabilities.available) {
      return {
        success: false,
        reason: capabilities.hasHardware ? ('NOT_ENROLLED' as const) : ('HARDWARE_UNAVAILABLE' as const),
        message: capabilities.unavailableReason ?? 'Biometric authentication is unavailable.',
      };
    }

    const result = await biometricService.authenticate('Confirm your identity to enable biometric unlock');
    if (result.success) {
      setBiometricEnabled(true);
      await biometricService.setBiometricPreference(true);
    }
    return result;
  }, []);

  const disableBiometrics = useCallback(async () => {
    setBiometricEnabled(false);
    await biometricService.setBiometricPreference(false);
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    const result = await biometricService.authenticate('Unlock WatchAI');
    if (result.success) {
      setIsLocked(false);
    }
    return result;
  }, []);

  const refreshBiometricCapabilities = useCallback(async () => {
    setBiometricCapabilities(await biometricService.getCapabilities());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user) && !isLocked,
      isLocked: Boolean(user) && isLocked,
      isBootstrapping,
      isSigningIn,
      signInError,
      biometricEnabled,
      biometricCapabilities,
      lastEmail,
      signIn,
      signOut,
      enableBiometrics,
      disableBiometrics,
      unlockWithBiometrics,
      fallbackToLogin,
      refreshBiometricCapabilities,
    }),
    [
      user,
      isLocked,
      isBootstrapping,
      isSigningIn,
      signInError,
      biometricEnabled,
      biometricCapabilities,
      lastEmail,
      signIn,
      signOut,
      enableBiometrics,
      disableBiometrics,
      unlockWithBiometrics,
      fallbackToLogin,
      refreshBiometricCapabilities,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
