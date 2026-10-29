export interface SelectedVideo {
  uri: string;
  name: string;
  mimeType: string;
  /** Size in bytes. 0 when the platform could not report it. */
  size: number;
  sizeLabel: string;
}

export type VideoPickFailureCode = 'CANCELLED' | 'UNSUPPORTED_TYPE' | 'FILE_MISSING' | 'UNKNOWN';

export type VideoPickResult =
  | { ok: true; video: SelectedVideo }
  | { ok: false; code: VideoPickFailureCode; message: string };

export type AnalysisStage =
  | 'IDLE'
  | 'PREPARING'
  | 'UPLOADING'
  | 'ANALYZING'
  | 'VALIDATING'
  | 'SAVING'
  | 'COMPLETE'
  | 'FAILED';

export const ANALYSIS_STAGE_LABELS: Record<AnalysisStage, string> = {
  IDLE: '',
  PREPARING: 'Preparing video...',
  UPLOADING: 'Uploading video...',
  ANALYZING: 'Gemini is analyzing...',
  VALIDATING: 'Validating safety events...',
  SAVING: 'Saving local result...',
  COMPLETE: 'Analysis complete',
  FAILED: 'Analysis failed',
};

export const ANALYSIS_STAGE_ORDER: AnalysisStage[] = [
  'PREPARING',
  'UPLOADING',
  'ANALYZING',
  'VALIDATING',
  'SAVING',
];
