import { useCallback, useState } from 'react';

import { BiometricAuthResult } from '../types/auth';
import { useAuth } from './useAuth';

export interface UseBiometrics {
  capabilities: ReturnType<typeof useAuth>['biometricCapabilities'];
  enabled: boolean;
  isChecking: boolean;
  status: string | null;
  enable: () => Promise<BiometricAuthResult>;
  disable: () => Promise<void>;
  unlock: () => Promise<BiometricAuthResult>;
  clearStatus: () => void;
}

/** Wraps the biometric flows with the loading + message state screens need. */
export function useBiometrics(): UseBiometrics {
  const {
    biometricCapabilities,
    biometricEnabled,
    enableBiometrics,
    disableBiometrics,
    unlockWithBiometrics,
  } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const enable = useCallback(async () => {
    setIsChecking(true);
    setStatus('Checking biometrics...');
    const result = await enableBiometrics();
    setStatus(result.message);
    setIsChecking(false);
    return result;
  }, [enableBiometrics]);

  const disable = useCallback(async () => {
    await disableBiometrics();
    setStatus('Biometric unlock disabled.');
  }, [disableBiometrics]);

  const unlock = useCallback(async () => {
    setIsChecking(true);
    setStatus('Checking biometrics...');
    const result = await unlockWithBiometrics();
    setStatus(result.success ? null : result.message);
    setIsChecking(false);
    return result;
  }, [unlockWithBiometrics]);

  const clearStatus = useCallback(() => setStatus(null), []);

  return {
    capabilities: biometricCapabilities,
    enabled: biometricEnabled,
    isChecking,
    status,
    enable,
    disable,
    unlock,
    clearStatus,
  };
}
