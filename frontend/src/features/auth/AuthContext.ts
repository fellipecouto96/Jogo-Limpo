import { createContext } from 'react';
import type { Organizer } from './types.ts';

export interface AuthContextValue {
  token: string | null;
  organizer: Organizer | null;
  isAuthenticated: boolean;
  login: (token: string, organizer: Organizer) => void;
  logout: () => void;
}

export interface AuthStateSnapshot {
  token: string | null;
  organizer: Organizer | null;
}

export function getStoredAuthState(): AuthStateSnapshot {
  if (typeof window === 'undefined') {
    return { token: null, organizer: null };
  }

  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('organizer');

  if (!raw) {
    return { token, organizer: null };
  }

  try {
    return { token, organizer: JSON.parse(raw) as Organizer };
  } catch {
    return { token, organizer: null };
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null);
