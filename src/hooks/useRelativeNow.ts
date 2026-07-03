import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const DEFAULT_RELATIVE_NOW_INTERVAL_MS = 30_000;

export function useRelativeNow(intervalMs = DEFAULT_RELATIVE_NOW_INTERVAL_MS): number {
  const [nowMillis, setNowMillis] = useState(() => Date.now());

  useEffect(() => {
    const updateNow = () => {
      setNowMillis(Date.now());
    };

    const intervalId = setInterval(updateNow, intervalMs);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        updateNow();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [intervalMs]);

  return nowMillis;
}
