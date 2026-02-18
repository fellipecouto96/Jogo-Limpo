import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useOnboarding } from './useOnboarding.ts';

// Mock useAuth to return a consistent organizer
vi.mock('../features/auth/useAuth.ts', () => ({
  useAuth: () => ({
    organizer: { id: 'org-test-123', name: 'Test', email: 'test@test.com' },
    token: 'fake-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const STORAGE_KEY = 'jl_onboarding:org-test-123';

describe('useOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with default state for new user', () => {
    const { result } = renderHook(() => useOnboarding(false));

    expect(result.current.isActive).toBe(true);
    expect(result.current.showWelcome).toBe(true);
    expect(result.current.isIdle).toBe(false);
  });

  it('does NOT show welcome when user has tournaments', () => {
    const { result } = renderHook(() => useOnboarding(true));

    expect(result.current.showWelcome).toBe(false);
    expect(result.current.isActive).toBe(true); // still active until completed
  });

  it('dismissWelcome updates state and hides welcome', () => {
    const { result } = renderHook(() => useOnboarding(false));

    act(() => {
      result.current.dismissWelcome();
    });

    expect(result.current.showWelcome).toBe(false);
  });

  it('persists state to localStorage', () => {
    const { result } = renderHook(() => useOnboarding(false));

    act(() => {
      result.current.dismissWelcome();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.welcomeDismissed).toBe(true);
  });

  it('loads persisted state on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        welcomeDismissed: true,
        completed: false,
        dismissedHints: ['hint-1'],
        shownToasts: [],
        pendingToast: null,
      })
    );

    const { result } = renderHook(() => useOnboarding(false));

    // welcomeDismissed, so no welcome screen even for new user
    expect(result.current.showWelcome).toBe(false);
    expect(result.current.shouldShowHint('hint-1')).toBe(false);
    expect(result.current.shouldShowHint('hint-2')).toBe(true);
  });

  // ─── Hints ──────────────────────
  it('shouldShowHint returns true for unknown hints when active', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.shouldShowHint('hint-test')).toBe(true);
  });

  it('shouldShowHint returns false after dismissing', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.dismissHint('hint-test');
    });

    expect(result.current.shouldShowHint('hint-test')).toBe(false);
  });

  it('shouldShowHint returns false when onboarding is completed', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.markComplete();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.shouldShowHint('hint-test')).toBe(false);
  });

  // ─── Toasts ──────────────────────
  it('triggerToast returns message for new toast', () => {
    const { result } = renderHook(() => useOnboarding());

    let message: string | null = null;
    act(() => {
      message = result.current.triggerToast('toast-first-draw');
    });

    expect(message).toBe('Chave organizada.');
    expect(result.current.activeToast).toBe('Chave organizada.');
  });

  it('triggerToast returns null for already-shown toast (show-once)', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.triggerToast('toast-first-draw');
    });

    let message: string | null = null;
    act(() => {
      message = result.current.triggerToast('toast-first-draw');
    });

    expect(message).toBeNull();
  });

  it('triggerToast returns null for unknown toast ID', () => {
    const { result } = renderHook(() => useOnboarding());

    let message: string | null = null;
    act(() => {
      message = result.current.triggerToast('toast-unknown');
    });

    expect(message).toBeNull();
  });

  it('triggerToast returns null when onboarding is inactive', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.markComplete();
    });

    let message: string | null = null;
    act(() => {
      message = result.current.triggerToast('toast-first-draw');
    });

    expect(message).toBeNull();
  });

  it('activeToast auto-clears after 3 seconds', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.triggerToast('toast-first-draw');
    });

    expect(result.current.activeToast).toBe('Chave organizada.');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.activeToast).toBeNull();
  });

  // ─── markComplete ──────────────────────
  it('markComplete sets isActive to false', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.markComplete();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('markComplete persists to localStorage', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.markComplete();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.completed).toBe(true);
  });

  // ─── Idle Timer ──────────────────────
  it('detects idle after 10 seconds with no interaction', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    expect(result.current.isIdle).toBe(true);
  });

  it('recordInteraction resets idle state', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    expect(result.current.isIdle).toBe(true);

    act(() => {
      result.current.recordInteraction();
    });

    expect(result.current.isIdle).toBe(false);
  });

  it('idle timer does not run when onboarding is completed', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.markComplete();
    });

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    // idle is not tracked when inactive
    expect(result.current.isIdle).toBe(false);
  });

  // ─── Multi-account isolation ──────────────────────
  it('uses organizer-specific storage key', () => {
    const { result } = renderHook(() => useOnboarding(false));

    act(() => {
      result.current.dismissWelcome();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem('jl_onboarding:other-id')).toBeNull();
  });
});
