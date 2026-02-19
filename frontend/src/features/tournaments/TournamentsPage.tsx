import { useTournaments } from './useTournaments.ts';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { parseGuidedSystemErrorText } from '../../shared/systemErrors.ts';

export function TournamentsPage() {
  const {
    data: tournaments,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    refetch,
    loadMore,
  } = useTournaments();
  const [showFinished, setShowFinished] = useState(false);
  const activeTournaments = useMemo(
    () => tournaments.filter((t) => t.status !== 'FINISHED'),
    [tournaments]
  );
  const finishedTournaments = useMemo(
    () => tournaments.filter((t) => t.status === 'FINISHED'),
    [tournaments]
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-white mb-3">Torneios</h1>
        <p className="text-base text-gray-300">
          Crie e inicie um torneio em menos de 2 minutos.
        </p>
      </div>

      <Link
        to="/app/new"
        className="mb-8 flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 text-xl font-bold text-gray-950 shadow-[0_14px_32px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60"
      >
        Criar novo torneio
      </Link>

      {isLoading && (
        <p className="text-gray-300 text-center py-12 text-lg">Carregando...</p>
      )}

      {error && (
        <div className="py-4">
          <GuidedErrorCard
            error={parseGuidedSystemErrorText(error)}
            onRetry={refetch}
          />
        </div>
      )}

      {!isLoading && !error && tournaments.length === 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-5 py-10 text-center text-gray-300">
          Nenhum torneio criado ainda.
        </div>
      )}

      {!isLoading && !error && tournaments.length > 0 && (
        <ul className="space-y-3">
          {activeTournaments.map((t) => {
            const status =
              t.status === 'RUNNING'
                ? 'Em andamento'
                : t.status === 'FINISHED'
                  ? 'Finalizado'
                  : 'Aguardando';
            return (
              <li key={t.id}>
                <Link
                  to={`/app/tournament/${t.id}`}
                  className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 transition hover:border-gray-600 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">{t.name}</p>
                    <p className="text-base text-gray-300">
                      {t.playerCount} jogadores · {status}
                    </p>
                  </div>
                  <span className="text-base font-semibold text-emerald-300">
                    Abrir
                  </span>
                </Link>
              </li>
            );
          })}

          {finishedTournaments.length > 0 && (
            <li className="pt-2">
              <button
                type="button"
                onClick={() => setShowFinished((current) => !current)}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-left text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                {showFinished
                  ? `Ocultar finalizados (${finishedTournaments.length})`
                  : `Mostrar finalizados (${finishedTournaments.length})`}
              </button>
            </li>
          )}

          {showFinished &&
            finishedTournaments.map((t) => (
              <li key={`finished-${t.id}`}>
                <Link
                  to={`/app/tournament/${t.id}/history`}
                  className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 transition hover:border-gray-600 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">{t.name}</p>
                    <p className="text-base text-gray-300">
                      {t.playerCount} jogadores · Finalizado
                    </p>
                  </div>
                  <span className="text-base font-semibold text-emerald-300">
                    Histórico
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}

      {!isLoading && !error && hasMore && (
        <div className="mt-6">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-gray-700 bg-gray-900 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoadingMore ? 'Carregando...' : 'Carregar mais torneios'}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">
            Exibindo {tournaments.length} de {total}
          </p>
        </div>
      )}
    </div>
  );
}
