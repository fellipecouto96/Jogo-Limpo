import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OnboardingHint } from './OnboardingHint.tsx';

// Mock useOnboarding
const mockDismissHint = vi.fn();
let mockShouldShowHint = true;

vi.mock('./useOnboarding.ts', () => ({
  useOnboarding: () => ({
    shouldShowHint: () => mockShouldShowHint,
    dismissHint: mockDismissHint,
    isActive: true,
    showWelcome: false,
    dismissWelcome: vi.fn(),
    triggerToast: vi.fn(),
    activeToast: null,
    markComplete: vi.fn(),
    isIdle: false,
    recordInteraction: vi.fn(),
  }),
}));

describe('OnboardingHint', () => {
  beforeEach(() => {
    mockShouldShowHint = true;
    mockDismissHint.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders hint message when visible', () => {
    render(<OnboardingHint id="hint-test" message="Test hint message" />);

    expect(screen.getByText('Test hint message')).toBeInTheDocument();
  });

  it('renders nothing when hint is dismissed', () => {
    mockShouldShowHint = false;

    const { container } = render(
      <OnboardingHint id="hint-test" message="Hidden hint" />
    );

    expect(container.innerHTML).toBe('');
  });

  it('calls dismissHint when X button is clicked', async () => {
    const user = userEvent.setup();

    render(<OnboardingHint id="hint-prize" message="Prize hint" />);

    const dismissButton = screen.getByRole('button', {
      name: /dispensar/i,
    });
    await user.click(dismissButton);

    expect(mockDismissHint).toHaveBeenCalledWith('hint-prize');
  });

  it('has accessible dismiss button with minimum touch target', () => {
    render(<OnboardingHint id="hint-test" message="Test" />);

    const dismissButton = screen.getByRole('button', {
      name: /dispensar/i,
    });
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton.className).toContain('min-h-[44px]');
    expect(dismissButton.className).toContain('min-w-[44px]');
  });
});
