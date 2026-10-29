import { IncidentStatus, Severity } from './incidentTypes';

export const colors = {
  bg: '#080B10',
  surface: '#111823',
  surfaceAlt: '#18212E',
  surfaceHigh: '#1F2A38',
  border: '#26333F',
  borderStrong: '#39485A',
  text: '#EAF0F6',
  textMuted: '#93A3B5',
  textDim: '#5E6E80',
  accent: '#00A6F5',
  accentSoft: 'rgba(0, 166, 245, 0.14)',
  low: '#35C98A',
  medium: '#F0B429',
  high: '#FF7A1A',
  critical: '#FF3B3B',
  criticalDeep: '#210708',
  criticalSoft: 'rgba(255, 59, 59, 0.14)',
  success: '#35C98A',
  successSoft: 'rgba(53, 201, 138, 0.14)',
  danger: '#FF3B3B',
  demo: '#B98CFF',
  demoSoft: 'rgba(185, 140, 255, 0.16)',
  overlay: 'rgba(4, 6, 10, 0.94)',
  black: '#04060A',
};

export const severityColors: Record<Severity, string> = {
  LOW: colors.low,
  MEDIUM: colors.medium,
  HIGH: colors.high,
  CRITICAL: colors.critical,
};

export const statusColors: Record<IncidentStatus, string> = {
  DETECTED: colors.critical,
  ACKNOWLEDGED: colors.medium,
  REVIEWED: colors.accent,
  RESOLVED: colors.success,
  REJECTED: colors.textDim,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const font = {
  display: 30,
  title: 22,
  heading: 17,
  body: 15,
  label: 13,
  micro: 11,
};

export const letterSpacing = {
  wide: 1.2,
  wider: 2,
};
