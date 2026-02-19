import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.ts';

interface OnboardingState {
  welcomeDismissed: boolean;
  completed: boolean;
  dismissedHints: string[];
  shownToasts: string[];
  pendingToast?: { message: string; expiresAt: number } | null;
}

const TOAST_MESSAGES: Record<string, string> = {
  'toast-first-draw': 'Chave organizada.',
  'toast-first-winner': '\u2714 Resultado registrado',
  'toast-tournament-finished': 'Torneio finalizado com sucesso.',
};

const TOAST_DURATION = 3000;
const IDLE_THRESHOLD = 10_000;

function storageKey(organizerId: string): string {
  return `jl_onboarding:${organizerId}`;
}

function loadState(organizerId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(storageKey(organizerId));
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch {
    // corrupted — start fresh
  }
  return {
    welcomeDismissed: false,
    completed: false,
    dismissedHints: [],
    shownToasts: [],
    pendingToast: null,
  };
}

function saveState(organizerId: string, state: OnboardingState): void {
  localStorage.setItem(storageKey(organizerId), JSON.stringify(state));
}

export function useOnboarding(hasTournaments?: boolean) {
  const { organizer } = useAuth();
  const organizerId = organizer?.id ?? '';

  const [state, setState] = useState<OnboardingState>(() =>
    organizerId ? loadState(organizerId) : {
      welcomeDismissed: false,
      completed: false,
      dismissedHints: [],
      shownToasts: [],
      pendingToast: null,
    }
  );

  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (organizerId) saveState(organizerId, state);
  }, [organizerId, state]);

  // On mount, check for a pending cross-page toast
  useEffect(() => {
    if (!organizerId) return;
    const current = loadState(organizerId);
    if (current.pendingToast && current.pendingToast.expiresAt > Date.now()) {
      const message = current.pendingToast.message;
      const openTimer = setTimeout(() => {
        setActiveToast(message);
        setState((prev) => ({ ...prev, pendingToast: null }));
      }, 0);
      const closeTimer = setTimeout(() => setActiveToast(null), TOAST_DURATION);
      return () => {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [organizerId]);

  // Idle timer — only runs when onboarding is active
  const isActive = !state.completed;

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      setIsIdle(elapsed > IDLE_THRESHOLD);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const recordInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIsIdle(false);
  }, []);

  const isNewUser = hasTournaments === false;
  const showWelcome = isNewUser && !state.welcomeDismissed && !state.completed;

  const dismissWelcome = useCallback(() => {
    setState((prev) => ({ ...prev, welcomeDismissed: true }));
  }, []);

  const shouldShowHint = useCallback(
    (id: string) => isActive && !state.dismissedHints.includes(id),
    [isActive, state.dismissedHints]
  );

  const dismissHint = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      dismissedHints: prev.dismissedHints.includes(id)
        ? prev.dismissedHints
        : [...prev.dismissedHints, id],
    }));
  }, []);

  const triggerToast = useCallback(
    (id: string): string | null => {
      if (!isActive) return null;
      if (state.shownToasts.includes(id)) return null;
      const message = TOAST_MESSAGES[id];
      if (!message) return null;

      setState((prev) => ({
        ...prev,
        shownToasts: [...prev.shownToasts, id],
        pendingToast: { message, expiresAt: Date.now() + TOAST_DURATION },
      }));

      setActiveToast(message);
      setTimeout(() => setActiveToast(null), TOAST_DURATION);

      return message;
    },
    [isActive, state.shownToasts]
  );

  const markComplete = useCallback(() => {
    setState((prev) => ({ ...prev, completed: true }));
  }, []);

  return {
    isActive,
    showWelcome,
    dismissWelcome,
    shouldShowHint,
    dismissHint,
    triggerToast,
    activeToast,
    markComplete,
    isIdle,
    recordInteraction,
  };
}
