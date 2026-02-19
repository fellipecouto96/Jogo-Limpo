import { useEffect, useState, type ButtonHTMLAttributes } from 'react';
import {
  LOADING_VISIBILITY_DELAY_MS,
  useLoadingVisibility,
} from './useLoadingVisibility.ts';

const SECOND_STAGE_MS = 2000;
const THIRD_STAGE_MS = 5000;

interface LoadingAssistTextProps {
  initialMessage?: string;
  className?: string;
  withVisibilityDelay?: boolean;
}

export function LoadingAssistText({
  initialMessage = 'Carregando informacoes',
  className = '',
  withVisibilityDelay = true,
}: LoadingAssistTextProps) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const visible = useLoadingVisibility(true, withVisibilityDelay ? LOADING_VISIBILITY_DELAY_MS : 0);

  useEffect(() => {
    const resetStageTimer = setTimeout(() => setStage(0), 0);
    const secondStageTimer = setTimeout(() => {
      setStage(1);
    }, SECOND_STAGE_MS);
    const thirdStageTimer = setTimeout(() => {
      setStage(2);
    }, THIRD_STAGE_MS);

    return () => {
      clearTimeout(resetStageTimer);
      clearTimeout(secondStageTimer);
      clearTimeout(thirdStageTimer);
    };
  }, [initialMessage]);

  if (!visible) return null;

  return (
    <p role="status" aria-live="polite" className={className}>
      {stage === 0
        ? initialMessage
        : stage === 1
          ? 'Organizando informacoes'
          : 'Pode levar alguns segundos'}
    </p>
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={['jl-skeleton rounded-xl', className].join(' ')} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  const visible = useLoadingVisibility(true);
  if (!visible) return null;

  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`dashboard-skeleton-${index}`} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <SkeletonBlock className="mb-3 h-6 w-3/5" />
            <SkeletonBlock className="mb-4 h-4 w-2/5" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <LoadingAssistText className="text-sm text-gray-400" withVisibilityDelay={false} />
    </div>
  );
}

export function ListPageSkeleton({ rows = 5 }: { rows?: number }) {
  const visible = useLoadingVisibility(true);
  if (!visible) return null;

  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`list-skeleton-${index}`}
          className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
        >
          <SkeletonBlock className="mb-2 h-5 w-2/5" />
          <SkeletonBlock className="h-4 w-1/3" />
        </div>
      ))}
      <LoadingAssistText className="text-sm text-gray-400" withVisibilityDelay={false} />
    </div>
  );
}

export function PublicProfileSkeleton() {
  const visible = useLoadingVisibility(true);
  if (!visible) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex flex-col items-center">
          <SkeletonBlock className="mb-2 h-9 w-56" />
          <SkeletonBlock className="h-4 w-24" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`public-profile-skeleton-${index}`}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="w-full space-y-2">
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-4 w-1/2" />
                </div>
                <SkeletonBlock className="h-6 w-24 rounded-full" />
              </div>
              <SkeletonBlock className="h-4 w-1/3" />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <LoadingAssistText
            initialMessage="Carregando informacoes"
            className="text-center text-sm text-gray-400"
            withVisibilityDelay={false}
          />
        </div>
      </div>
    </div>
  );
}

export function TournamentPageSkeleton() {
  const visible = useLoadingVisibility(true);
  if (!visible) return null;

  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <SkeletonBlock className="mb-3 h-8 w-2/5" />
        <SkeletonBlock className="h-4 w-1/3" />
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
        <SkeletonBlock className="mb-3 h-4 w-40" />
        <div className="grid gap-2 sm:grid-cols-2">
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
      </div>

      <BracketSkeleton withVisibilityDelay={false} />

      <LoadingAssistText className="text-sm text-gray-400" withVisibilityDelay={false} />
    </div>
  );
}

export function HistoryPageSkeleton() {
  const visible = useLoadingVisibility(true);
  if (!visible) return null;

  return (
    <div className="space-y-6" aria-hidden="true">
      <SkeletonBlock className="h-32 rounded-3xl" />
      <SkeletonBlock className="h-56 rounded-3xl" />
      <BracketSkeleton withVisibilityDelay={false} />
      <LoadingAssistText className="text-sm text-gray-400" withVisibilityDelay={false} />
    </div>
  );
}

export function BracketSkeleton({
  columns = 4,
  withVisibilityDelay = true,
}: {
  columns?: number;
  withVisibilityDelay?: boolean;
}) {
  const visible = useLoadingVisibility(
    true,
    withVisibilityDelay ? LOADING_VISIBILITY_DELAY_MS : 0
  );
  const columnCount = Math.max(2, columns);
  if (!visible) return null;
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4" aria-hidden="true">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(160px, 1fr))` }}
      >
        {Array.from({ length: columnCount }).map((_, columnIndex) => (
          <div key={`bracket-skeleton-col-${columnIndex}`} className="space-y-3">
            <SkeletonBlock className="h-4 w-2/3" />
            {Array.from({ length: 3 }).map((__, matchIndex) => (
              <SkeletonBlock
                key={`bracket-skeleton-match-${columnIndex}-${matchIndex}`}
                className="h-20"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface FullScreenLoadingProps {
  message?: string;
}

export function FullScreenLoading({
  message = 'Carregando torneio',
}: FullScreenLoadingProps) {
  const visible = useLoadingVisibility(true);
  if (!visible) return null;

  return (
    <div className="min-h-screen bg-gray-950 px-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center text-center">
        <p className="font-display text-4xl">Jogo Limpo</p>
        <div className="jl-loading-underline mt-4 h-[2px] w-44 rounded-full bg-emerald-300/60" />
        <LoadingAssistText
          initialMessage={message}
          className="mt-5 text-sm text-gray-300"
          withVisibilityDelay={false}
        />
      </div>
    </div>
  );
}

type ActionLoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading: boolean;
  idleLabel: string;
  loadingLabel: string;
};

export function ActionLoadingButton({
  isLoading,
  idleLabel,
  loadingLabel,
  className = '',
  disabled,
  ...props
}: ActionLoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={['relative overflow-hidden', className].join(' ')}
    >
      <span className="relative z-10 inline-flex min-w-[13ch] justify-center">
        {isLoading ? loadingLabel : idleLabel}
      </span>
      {isLoading && (
        <span className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-black/15">
          <span className="jl-button-progress block h-full w-2/5 rounded-full bg-gray-950/60" />
        </span>
      )}
    </button>
  );
}

export function QRLoadingPlaceholder({
  label = 'Preparando QR Code',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        'relative flex items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white',
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      <div className="jl-qr-border absolute inset-0 rounded-xl border border-gray-300/80" />
      <div className="jl-skeleton absolute inset-2 rounded-lg bg-gray-100" />
      <p className="relative z-10 text-[11px] font-semibold text-gray-500">{label}</p>
    </div>
  );
}
