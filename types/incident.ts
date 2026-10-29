import { AnalysisStatus, IncidentStatus, IncidentType, Severity } from '../constants/incidentTypes';

/** Where an incident came from. Simulated records must always be distinguishable. */
export type IncidentSource = 'GEMINI' | 'DEMO' | 'SEED';

/**
 * The anomalous region within the frame, as fractions of frame width/height (0-1)
 * with the origin at the top left. Gemini reports `box_2d` normalized to 0-1000;
 * that is converted here. Null whenever the model did not localise the incident -
 * a box is never invented.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Incident {
  id: string;
  incidentType: IncidentType;
  /** `MM:SS` offset inside the analysed footage. Empty when the model gave none. */
  timestamp: string;
  severity: Severity;
  /** 0.0 - 1.0 */
  confidence: number;
  description: string;
  evidence: string;
  recommendedAction: string;
  status: IncidentStatus;
  createdAt: string;
  source: IncidentSource;
  /** File name of the analysed clip, when the incident came from an analysis. */
  videoName: string | null;
  /** Local URI of the analysed clip, so the incident can be replayed. */
  videoUri: string | null;
  /** Where in the frame the incident was seen, or null if not localised. */
  region: BoundingBox | null;
}

export interface AnalysisResult {
  id: string;
  analysisStatus: AnalysisStatus;
  summary: string;
  incidents: Incident[];
  videoName: string;
  videoUri: string | null;
  createdAt: string;
  source: IncidentSource;
  /** Incidents the local validator rejected because required fields were unusable. */
  droppedIncidents: number;
}

export type IncidentAction = 'ACKNOWLEDGE' | 'REVIEW' | 'RESOLVE' | 'REJECT';
