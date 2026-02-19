import { getApiUrl } from './api.ts';

export function logClientError(
  journey: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
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
