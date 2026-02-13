import { useState, useCallback, type ReactNode } from 'react';
import { AuthContext, getStoredAuthState } from './AuthContext.ts';
import type { Organizer } from './types.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialState = getStoredAuthState();
  const [token, setToken] = useState<string | null>(initialState.token);
  const [organizer, setOrganizer] = useState<Organizer | null>(
    initialState.organizer
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
