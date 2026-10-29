import { Incident } from '../types/incident';
import { DemoAccount } from '../types/auth';
import { ROLES } from './roles';
import { createId } from '../lib/format';

/**
 * Hard-coded demo credentials. There is no backend, no auth provider and no user table.
 * A role belongs to a credential - the signed-in user can never pick their own role.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'user_admin',
    email: 'admin@watchai.demo',
    password: 'watchai123',
    name: 'A. Rao',
    role: ROLES.ADMIN,
    department: 'Plant Safety Systems',
  },
  {
    id: 'user_officer',
    email: 'officer@watchai.demo',
    password: 'watchai123',
    name: 'S. Menon',
    role: ROLES.SAFETY_OFFICER,
    department: 'Line 3 Safety Desk',
  },
  {
    id: 'user_supervisor',
    email: 'supervisor@watchai.demo',
    password: 'watchai123',
    name: 'K. Iyer',
    role: ROLES.SUPERVISOR,
    department: 'Shift Supervision',
  },
  {
    id: 'user_viewer',
    email: 'viewer@watchai.demo',
    password: 'watchai123',
    name: 'D. Nair',
    role: ROLES.VIEWER,
    department: 'Compliance Observer',
  },
];

/**
 * Demonstration records only - these are seeded locally so the dashboard is not empty
 * during a demo. They do not come from a CCTV archive or any database.
 */
export function buildSeedIncidents(): Incident[] {
  const now = Date.now();
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  return [
    {
      id: createId('inc'),
      incidentType: 'WORKER_FALL',
      timestamp: '00:14',
      severity: 'CRITICAL',
      confidence: 0.96,
      description: 'A worker loses balance and falls to the floor beside the conveyor line.',
      evidence: 'Worker visibly drops below the guard rail line and remains on the floor.',
      recommendedAction: 'Verify the worker’s condition immediately and secure the surrounding area.',
      status: 'DETECTED',
      createdAt: minutesAgo(6),
      source: 'SEED',
      videoName: 'sample_line3_cam2.mp4',
      videoUri: null,
      region: { x: 0.34, y: 0.52, width: 0.24, height: 0.33 },
    },
    {
      id: createId('inc'),
      incidentType: 'DANGEROUS_MACHINE_PROXIMITY',
      timestamp: '02:18',
      severity: 'HIGH',
      confidence: 0.94,
      description: 'A worker reaches into the operating envelope of a moving machine.',
      evidence: 'Arm crosses the yellow boundary while the machine head is still cycling.',
      recommendedAction: 'Stop the machine and brief the operator on lock-out procedure.',
      status: 'ACKNOWLEDGED',
      createdAt: minutesAgo(42),
      source: 'SEED',
      videoName: 'sample_line3_cam2.mp4',
      videoUri: null,
      region: { x: 0.58, y: 0.3, width: 0.2, height: 0.4 },
    },
    {
      id: createId('inc'),
      incidentType: 'MISSING_PPE',
      timestamp: '01:32',
      severity: 'MEDIUM',
      confidence: 0.91,
      description: 'A worker walks through the fabrication bay without a safety helmet.',
      evidence: 'No head protection visible while inside the marked hard-hat zone.',
      recommendedAction: 'Escort the worker out of the zone and issue the required PPE.',
      status: 'REVIEWED',
      createdAt: minutesAgo(96),
      source: 'SEED',
      videoName: 'sample_bay1_cam5.mp4',
      videoUri: null,
      region: { x: 0.42, y: 0.18, width: 0.16, height: 0.26 },
    },
    {
      id: createId('inc'),
      incidentType: 'RESTRICTED_ZONE_ENTRY',
      timestamp: '00:47',
      severity: 'LOW',
      confidence: 0.72,
      description: 'A person briefly steps across a restricted-zone marking and returns.',
      evidence: 'One foot crosses the painted boundary for roughly two seconds.',
      recommendedAction: 'Remind the shift about restricted-zone boundaries at handover.',
      status: 'RESOLVED',
      createdAt: minutesAgo(210),
      source: 'SEED',
      videoName: 'sample_bay1_cam5.mp4',
      videoUri: null,
      region: { x: 0.12, y: 0.6, width: 0.18, height: 0.22 },
    },
  ];
}

/** The simulated critical incident used by demo mode (section: DEMO MODE). */
export function buildDemoCriticalIncident(): Incident {
  return {
    id: createId('demo'),
    incidentType: 'WORKER_FALL',
    timestamp: '00:14',
    severity: 'CRITICAL',
    confidence: 0.96,
    description: 'Worker fall detected in the monitored work area.',
    evidence: 'Worker visibly falls within the monitored area and does not get up.',
    recommendedAction: 'Immediately verify the worker’s condition and secure the surrounding area.',
    status: 'DETECTED',
    createdAt: new Date().toISOString(),
    source: 'DEMO',
    videoName: null,
    videoUri: null,
    region: { x: 0.36, y: 0.5, width: 0.26, height: 0.34 },
  };
}
