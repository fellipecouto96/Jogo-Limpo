import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Organizer } from './types.ts';

interface AuthContextValue {
  token: string | null;
  organizer: Organizer | null;
  isAuthenticated: boolean;
  login: (token: string, organizer: Organizer) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialState(): {
  token: string | null;
  organizer: Organizer | null;
} {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('organizer');
  let organizer: Organizer | null = null;

  if (raw) {
    try {
      organizer = JSON.parse(raw);
    } catch {
      organizer = null;
    }
  }

  return { token, organizer };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = loadInitialState();
  const [token, setToken] = useState<string | null>(initial.token);
  const [organizer, setOrganizer] = useState<Organizer | null>(
    initial.organizer
  );

  const login = useCallback((newToken: string, newOrganizer: Organizer) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('organizer', JSON.stringify(newOrganizer));
    setToken(newToken);
    setOrganizer(newOrganizer);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('organizer');
    setToken(null);
    setOrganizer(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        organizer,
        isAuthenticated: token !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
