import { useParams, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { usePublicProfile } from './usePublicProfile.ts';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';
import { ProgressiveLoadingMessage } from '../../shared/ProgressiveLoadingMessage.tsx';

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [showHistory, setShowHistory] = useState(false);
  const runningProfile = usePublicProfile(slug!, {
    status: 'RUNNING',
    enabled: Boolean(slug),
    limit: 8,
  });
  const finishedProfile = usePublicProfile(slug!, {
    status: 'FINISHED',
    enabled: Boolean(slug) && showHistory,
    limit: 6,
  });
  const displayName = runningProfile.data?.name ?? finishedProfile.data?.name ?? '';
  const totalTournaments = useMemo(
    () =>
      (runningProfile.data?.pagination.total ?? 0) +
      (finishedProfile.data?.pagination.total ?? 0),
    [finishedProfile.data?.pagination.total, runningProfile.data?.pagination.total]
  );

  if (runningProfile.isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <ProgressiveLoadingMessage className="text-white text-lg min-h-7" />
      </div>
    );
  }

  if (runningProfile.error || !runningProfile.data) {
    const guidedError =
      runningProfile.error ?? resolveGuidedSystemError({ context: 'public_link' });
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="mx-auto w-full max-w-lg">
          <GuidedErrorCard error={guidedError} onRetry={runningProfile.refetch} />
        </div>
      </div>
    );
  }

  const running = runningProfile.data.tournaments;
  const finished = finishedProfile.data?.tournaments ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">{displayName}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {totalTournaments} torneio{totalTournaments !== 1 ? 's' : ''}
          </p>
        </header>

        {running.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-500 text-sm">Nenhum torneio disponivel.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {running.map((t) => (
              <Link
                key={t.publicSlug}
                to={`/tournament/${t.publicSlug}`}
                className="block rounded-2xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white truncate">
                      {t.name}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t.playerCount} jogador{t.playerCount === 1 ? '' : 'es'}
                      {' · '}
                      {formatDate(t.startedAt ?? t.createdAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={t.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'}
                  />
                </div>
                {t.championName && (
                  <p className="text-sm text-emerald-400">
                    Campeao: {t.championName}
                  </p>
                )}
              </Link>
            ))}

            {runningProfile.hasMore && (
              <button
                type="button"
                onClick={runningProfile.loadMore}
                disabled={runningProfile.isLoadingMore}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {runningProfile.isLoadingMore
                  ? 'Atualizando dados'
                  : 'Carregar mais em andamento'}
              </button>
            )}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            {showHistory ? 'Ocultar histórico público' : 'Mostrar histórico público'}
          </button>
        </div>

        {showHistory && (
          <section className="mt-4 space-y-3">
            {finishedProfile.isLoading && (
              <p className="text-center text-sm text-gray-400 min-h-5">Atualizando dados</p>
            )}

            {finished.map((t) => (
              <Link
                key={`finished-${t.publicSlug}`}
                to={`/tournament/${t.publicSlug}`}
                className="block rounded-2xl border border-gray-800 bg-gray-900/80 p-4 transition hover:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white truncate">
                      {t.name}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t.playerCount} jogador{t.playerCount === 1 ? '' : 'es'}
                      {' · '}
                      {formatDate(t.finishedAt ?? t.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status="FINISHED" />
                </div>
                {t.championName && (
                  <p className="text-sm text-emerald-400">
                    Campeao: {t.championName}
                  </p>
                )}
              </Link>
            ))}

            {finishedProfile.hasMore && (
              <button
                type="button"
                onClick={finishedProfile.loadMore}
                disabled={finishedProfile.isLoadingMore}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {finishedProfile.isLoadingMore
                  ? 'Atualizando dados'
                  : 'Carregar mais histórico'}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
