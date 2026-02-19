import { Link } from 'react-router-dom';
import type { GuidedSystemError } from './systemErrors.ts';

interface GuidedErrorCardProps {
  error: GuidedSystemError;
  onRetry?: () => void;
  className?: string;
}

export function GuidedErrorCard({
  error,
  onRetry,
  className = '',
}: GuidedErrorCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border border-slate-600/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 ${className}`}
    >
      <p className="font-semibold text-slate-100">{error.what}</p>
      <p className="mt-1 text-slate-300">{error.why}</p>
      <p className="mt-1 text-slate-200">{error.next}</p>
      {error.helper && <p className="mt-2 text-xs text-slate-300">{error.helper}</p>}

      {error.actionHref ? (
        <Link
          to={error.actionHref}
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-500 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          {error.actionLabel ?? 'Continuar'}
        </Link>
      ) : onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-500 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          {error.actionLabel ?? 'Tentar novamente'}
        </button>
      ) : null}
    </div>
  );
}
