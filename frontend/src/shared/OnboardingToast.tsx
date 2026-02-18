import { useOnboarding } from './useOnboarding.ts';

export function OnboardingToast() {
  const { activeToast } = useOnboarding();

  if (!activeToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-gray-900/95 px-5 py-3 text-sm font-medium text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm"
    >
      {activeToast}
    </div>
  );
}
