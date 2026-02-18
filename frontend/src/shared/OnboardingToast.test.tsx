import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { OnboardingToast } from './OnboardingToast.tsx';

let mockActiveToast: string | null = null;

vi.mock('./useOnboarding.ts', () => ({
  useOnboarding: () => ({
    activeToast: mockActiveToast,
    isActive: true,
    showWelcome: false,
    dismissWelcome: vi.fn(),
    shouldShowHint: vi.fn(),
    dismissHint: vi.fn(),
    triggerToast: vi.fn(),
    markComplete: vi.fn(),
    isIdle: false,
    recordInteraction: vi.fn(),
  }),
}));

describe('OnboardingToast', () => {
  beforeEach(() => {
    mockActiveToast = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when no active toast', () => {
    const { container } = render(<OnboardingToast />);
    expect(container.innerHTML).toBe('');
  });

  it('renders toast message when active', () => {
    mockActiveToast = 'Chave organizada.';
    render(<OnboardingToast />);
    expect(screen.getByText('Chave organizada.')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    mockActiveToast = 'Test toast';
    render(<OnboardingToast />);

    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('has fixed positioning for bottom of viewport', () => {
    mockActiveToast = 'Positioned toast';
    render(<OnboardingToast />);

    const toast = screen.getByRole('status');
    expect(toast.className).toContain('fixed');
    expect(toast.className).toContain('bottom-20');
    expect(toast.className).toContain('z-50');
  });
});
