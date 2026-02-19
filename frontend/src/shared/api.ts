const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:3333'
    : 'https://jogo-limpo-backend.vercel.app');

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export class HttpResponseError extends Error {
  public readonly status: number;
  public readonly backendError: string | null;

  constructor(
    status: number,
    backendError: string | null
  ) {
    super(backendError ?? `Falha na requisicao (${status})`);
    this.status = status;
    this.backendError = backendError;
    this.name = 'HttpResponseError';
  }
}

export interface NormalizedApiError {
  status: number | null;
  backendError: string | null;
  message: string;
  isNetwork: boolean;
}

export async function buildHttpResponseError(
  response: Response
): Promise<HttpResponseError> {
  let backendError: string | null = null;

  try {
    const body = (await response.clone().json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error.trim().length > 0) {
      backendError = body.error.trim();
    }
  } catch {
    // Ignore parse errors and keep a safe fallback
  }

  return new HttpResponseError(response.status, backendError);
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof HttpResponseError) {
    return {
      status: error.status,
      backendError: error.backendError,
      message: error.message,
      isNetwork: false,
    };
  }

  if (error instanceof TypeError) {
    return {
      status: null,
      backendError: null,
      message: error.message,
      isNetwork: true,
    };
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    const isNetwork =
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network error') ||
      lower.includes('load failed');
    return {
      status: null,
      backendError: null,
      message: error.message,
      isNetwork,
    };
  }

  return {
    status: null,
    backendError: null,
    message: 'Erro desconhecido',
    isNetwork: false,
  };
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('organizer');
    window.location.href = '/login';
    throw new Error('Sessao expirada');
  }

  return response;
}
