import { useOnboarding } from './useOnboarding.ts';

interface OnboardingHintProps {
  id: string;
  message: string;
}

export function OnboardingHint({ id, message }: OnboardingHintProps) {
  const { shouldShowHint, dismissHint } = useOnboarding();

  if (!shouldShowHint(id)) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-200">
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => dismissHint(id)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-emerald-300/70 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 [touch-action:manipulation]"
        aria-label="Dispensar dica"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
