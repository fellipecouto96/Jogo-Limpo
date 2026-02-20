import { logEvent } from './log.service.js';
import type { LogJourney } from './journeys.js';

const SLOW_QUERY_THRESHOLD_MS = 500;

export function logSlowQuery(
  journey: LogJourney,
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  if (durationMs <= SLOW_QUERY_THRESHOLD_MS) return;

  logEvent({
    level: 'WARN',
    journey,
    message: `Consulta lenta: ${operation}`,
    metadata: {
      operation,
      durationMs: Number(durationMs.toFixed(2)),
      thresholdMs: SLOW_QUERY_THRESHOLD_MS,
      ...(metadata ?? {}),
    },
  });
}

export async function withPerformanceLog<T>(
  journey: LogJourney,
  operation: string,
  run: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  const result = await run();
  const durationMs = performance.now() - start;
  logSlowQuery(journey, operation, durationMs, metadata);
  return result;
}
