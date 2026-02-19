import { useEffect, useState } from 'react';

export const LOADING_VISIBILITY_DELAY_MS = 300;

export function useLoadingVisibility(
  isLoading: boolean,
  delayMs: number = LOADING_VISIBILITY_DELAY_MS
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const resetTimer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(() => setVisible(true), Math.max(0, delayMs));
    return () => clearTimeout(timer);
  }, [delayMs, isLoading]);

  return visible;
}
