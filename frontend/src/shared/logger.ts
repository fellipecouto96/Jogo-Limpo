import { getApiUrl } from './api.ts';

export function logClientError(
  journey: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  sendClientLog(journey, message, metadata);
}

export function logClientPerformance(
  journey: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  sendClientLog(journey, message, metadata);
}

function sendClientLog(
  journey: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  try {
    fetch(getApiUrl('/logs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journey, message, metadata }),
    }).catch(() => {
      // Silently ignore — logging must never break the UI
    });
  } catch {
    // Silently ignore — logging must never break the UI
  }
}
