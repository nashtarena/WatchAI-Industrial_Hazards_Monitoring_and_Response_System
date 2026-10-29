import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '../lib/config';
import { BiometricAuthResult, BiometricCapabilities } from '../types/auth';

/**
 * Biometric verification is performed entirely by the operating system.
 * No biometric data, fingerprint or Face ID template is ever read or stored here -
 * only a local "the user opted in" boolean.
 */

function describeMethods(types: LocalAuthentication.AuthenticationType[]): string {
  const labels: string[] = [];
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    labels.push(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    labels.push(Platform.OS === 'ios' ? 'Face ID' : 'Face unlock');
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    labels.push('Iris');
  }
  if (labels.length === 0) return 'Device biometrics';
  return labels.join(' / ');
}

export async function getCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        hasHardware: false,
        isEnrolled: false,
        available: false,
        methodLabel: 'Not supported',
        unavailableReason: 'This device has no biometric hardware.',
      };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const methodLabel = describeMethods(types);

    if (!isEnrolled) {
      return {
        hasHardware: true,
        isEnrolled: false,
        available: false,
        methodLabel,
        unavailableReason: 'No biometric is enrolled on this device. Add one in device settings.',
      };
    }

    return { hasHardware: true, isEnrolled: true, available: true, methodLabel, unavailableReason: null };
  } catch {
    return {
      hasHardware: false,
      isEnrolled: false,
      available: false,
      methodLabel: 'Unavailable',
      unavailableReason: 'Biometric hardware could not be queried on this device.',
    };
  }
}

/**
 * Prompts the OS for biometric verification.
 * Every failure path is recoverable - the caller always falls back to demo login.
 */
export async function authenticate(promptMessage: string): Promise<BiometricAuthResult> {
  const capabilities = await getCapabilities();

  if (!capabilities.hasHardware) {
    return {
      success: false,
      reason: 'HARDWARE_UNAVAILABLE',
      message: capabilities.unavailableReason ?? 'Biometric hardware is unavailable.',
    };
  }
  if (!capabilities.isEnrolled) {
    return {
      success: false,
      reason: 'NOT_ENROLLED',
      message: capabilities.unavailableReason ?? 'No biometric is enrolled on this device.',
    };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use password instead',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true, reason: 'SUCCESS', message: 'Biometric authentication successful.' };
    }

    const error = 'error' in result ? result.error : 'unknown';
    if (error === 'user_cancel' || error === 'system_cancel' || error === 'app_cancel') {
      return {
        success: false,
        reason: 'CANCELLED',
        message: 'Biometric authentication was cancelled.',
      };
    }
    return {
      success: false,
      reason: 'FAILED',
      message: 'Biometric authentication failed. You can continue with demo login.',
    };
  } catch {
    return {
      success: false,
      reason: 'UNKNOWN',
      message: 'Biometric authentication is not available right now.',
    };
  }
}

export async function getBiometricPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.biometricEnabled, enabled ? 'true' : 'false');
  } catch {
    // A storage failure only means the preference will not survive a restart.
  }
}
