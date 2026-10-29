import { useContext } from 'react';

import { WatchAIContext, WatchAIContextValue } from '../context/WatchAIContext';

export function useWatchAI(): WatchAIContextValue {
  const context = useContext(WatchAIContext);
  if (!context) {
    throw new Error('useWatchAI must be used inside <WatchAIProvider>.');
  }
  return context;
}
