const API_BASE = import.meta.env.VITE_API_URL ?? 'https://jogo-limpo-backend-bvbfxjiw4-fellipe-coutos-projects.vercel.app';

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
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
