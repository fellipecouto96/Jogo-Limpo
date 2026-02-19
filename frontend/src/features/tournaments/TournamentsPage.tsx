import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useTournaments } from './useTournaments.ts';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { parseGuidedSystemErrorText } from '../../shared/systemErrors.ts';
import {
  ActionLoadingButton,
  ListPageSkeleton,
} from '../../shared/loading/LoadingSystem.tsx';

type FilterTab = 'ALL' | 'ACTIVE' | 'FINISHED';

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

  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [finishedExpanded, setFinishedExpanded] = useState(false);

  const activeTournaments = useMemo(
    () => tournaments.filter((t) => t.status === 'RUNNING' || t.status === 'OPEN'),
    [tournaments]
  );
  const finishedTournaments = useMemo(
    () => tournaments.filter((t) => t.status === 'FINISHED'),
    [tournaments]
  );

  const filteredActive =
    filter === 'FINISHED' ? [] : activeTournaments;
  const filteredFinished =
    filter === 'ACTIVE'
      ? []
      : filter === 'FINISHED' || finishedExpanded
        ? finishedTournaments
        : [];

  const shouldOfferLoadMore =
    hasMore &&
    (filter === 'FINISHED' || filter === 'ALL' ? finishedExpanded || filter === 'FINISHED' : true);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl text-white">Torneios</h1>
          <p className="text-sm text-gray-400">Controle de eventos e resultados</p>
        </div>
        <Link
          to="/app/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          Criar torneio
        </Link>
      </header>

      <section className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          <FilterButton
            active={filter === 'ALL'}
            label="Todos"
            onClick={() => setFilter('ALL')}
          />
          <FilterButton
            active={filter === 'ACTIVE'}
            label="Ativos"
            onClick={() => setFilter('ACTIVE')}
          />
          <FilterButton
            active={filter === 'FINISHED'}
            label="Finalizados"
            onClick={() => {
              setFilter('FINISHED');
              setFinishedExpanded(true);
            }}
          />
        </div>
      </section>

      {isLoading && <ListPageSkeleton rows={7} />}

      {error && (
        <GuidedErrorCard
          error={parseGuidedSystemErrorText(error)}
          onRetry={refetch}
        />
      )}

      {!isLoading && !error && tournaments.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-sm text-gray-300">
          Nenhum torneio criado ainda.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {(filter === 'ALL' || filter === 'ACTIVE') && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-gray-300">
                  Ativos
                </h2>
                <p className="text-xs text-gray-500">
                  {activeTournaments.length} em operação
                </p>
              </div>
              {filteredActive.length === 0 ? (
                <p className="rounded-lg border border-gray-800 bg-[#0b1222] px-3 py-3 text-sm text-gray-400">
                  Sem torneios ativos no momento.
                </p>
              ) : (
                filteredActive.map((t) => (
                  <article
                    key={t.id}
                    className="rounded-xl border border-emerald-500/30 bg-[#0b1222] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-gray-300">
                          {formatDate(t.startedAt ?? t.createdAt)} · {t.playerCount} jogador
                          {t.playerCount === 1 ? '' : 'es'}
                        </p>
                      </div>
                      <StatusChip status={t.status} />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Link
                        to={`/app/tournament/${t.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-gray-950 transition hover:bg-emerald-400"
                      >
                        Continuar
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          {(filter === 'ALL' || filter === 'FINISHED') && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-gray-300">
                  Finalizados
                </h2>
                {filter === 'ALL' && finishedTournaments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFinishedExpanded((current) => !current)}
                    className="h-8 rounded-lg border border-gray-700 bg-gray-900 px-3 text-xs font-semibold text-gray-200 transition hover:bg-gray-800"
                  >
                    {finishedExpanded ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
              </div>

              {(filter === 'FINISHED' || finishedExpanded) &&
                (filteredFinished.length === 0 ? (
                  <p className="rounded-lg border border-gray-800 bg-[#0b1222] px-3 py-3 text-sm text-gray-400">
                    Nenhum torneio finalizado encontrado.
                  </p>
                ) : (
                  filteredFinished.map((t) => (
                    <article
                      key={t.id}
                      className="rounded-xl border border-gray-800 bg-[#0b1222] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                          <p className="text-xs text-gray-300">
                            {formatDate(t.finishedAt ?? t.createdAt)} · {t.playerCount} jogador
                            {t.playerCount === 1 ? '' : 'es'}
                          </p>
                        </div>
                        <StatusChip status={t.status} />
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-300 sm:grid-cols-3">
                        <p className="truncate">
                          Campeão: <span className="font-semibold text-white">{t.championName ?? '—'}</span>
                        </p>
                        <p>
                          Arrecadação:{' '}
                          <span className="font-semibold text-white">
                            {formatCurrency(t.totalCollected ?? 0)}
                          </span>
                        </p>
                        <p>
                          Lucro organizador:{' '}
                          <span className="font-semibold text-emerald-300">
                            {formatCurrency(t.organizerProfit ?? 0)}
                          </span>
                        </p>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <Link
                          to={`/app/tournament/${t.id}/history`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-3 text-xs font-semibold text-gray-100 transition hover:bg-gray-800"
                        >
                          Ver resultado
                        </Link>
                      </div>
                    </article>
                  ))
                ))}
            </section>
          )}
        </>
      )}

      {!isLoading && !error && shouldOfferLoadMore && (
        <div className="pt-1">
          <ActionLoadingButton
            type="button"
            onClick={loadMore}
            isLoading={isLoadingMore}
            idleLabel="Carregar mais registros"
            loadingLabel="Atualizando dados"
            className="h-10 rounded-lg border border-gray-700 bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Carregar mais registros
          </ActionLoadingButton>
          <p className="mt-2 text-xs text-gray-500">Exibindo {tournaments.length} de {total}</p>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-8 rounded-lg border px-3 text-xs font-semibold transition',
        active
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
          : 'border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function StatusChip({ status }: { status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED' }) {
  const label =
    status === 'RUNNING' ? 'Em andamento' : status === 'FINISHED' ? 'Finalizado' : 'Aguardando';
  const tone =
    status === 'RUNNING'
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
      : status === 'FINISHED'
        ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
        : 'border-gray-600 bg-gray-800 text-gray-200';

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
