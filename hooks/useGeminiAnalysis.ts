import { useCallback, useRef, useState } from 'react';

import { AnalysisFailure, analyzeVideo } from '../services/geminiService';
import { AnalysisResult } from '../types/incident';
import { AnalysisStage, SelectedVideo } from '../types/video';
import { useWatchAI } from './useWatchAI';

export interface UseGeminiAnalysis {
  stage: AnalysisStage;
  isAnalyzing: boolean;
  failure: AnalysisFailure | null;
  result: AnalysisResult | null;
  run: (video: SelectedVideo) => Promise<void>;
  reset: () => void;
}

/**
 * Drives one Gemini analysis at a time and hands the validated result to the
 * WatchAI store, which applies the severity-driven alert behaviour.
 */
export function useGeminiAnalysis(): UseGeminiAnalysis {
  const { ingestAnalysis } = useWatchAI();
  const [stage, setStage] = useState<AnalysisStage>('IDLE');
  const [failure, setFailure] = useState<AnalysisFailure | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (video: SelectedVideo) => {
      // Hard guard against duplicate requests from repeated taps.
      if (inFlight.current) return;
      inFlight.current = true;

      setFailure(null);
      setResult(null);
      setStage('PREPARING');

      try {
        const outcome = await analyzeVideo(video, { onStage: setStage });

        if (!outcome.ok) {
          setFailure(outcome);
          setStage('FAILED');
          return;
        }

        setStage('SAVING');
        await ingestAnalysis(outcome.result);
        setResult(outcome.result);
        setStage('COMPLETE');
      } catch {
        setFailure({
          ok: false,
          code: 'UNKNOWN',
          message: 'The analysis stopped unexpectedly. Try again.',
        });
        setStage('FAILED');
      } finally {
        inFlight.current = false;
      }
    },
    [ingestAnalysis],
  );

  const reset = useCallback(() => {
    setStage('IDLE');
    setFailure(null);
    setResult(null);
  }, []);

  return {
    stage,
    isAnalyzing: stage !== 'IDLE' && stage !== 'COMPLETE' && stage !== 'FAILED',
    failure,
    result,
    run,
    reset,
  };
}
