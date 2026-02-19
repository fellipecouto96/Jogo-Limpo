import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.ts';
import { useDashboard } from './useDashboard.ts';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { useOnboarding } from '../../shared/useOnboarding.ts';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { parseGuidedSystemErrorText } from '../../shared/systemErrors.ts';
import { DashboardSkeleton } from '../../shared/loading/LoadingSystem.tsx';
import { ProfileShareDrawer } from './ProfileShareDrawer.tsx';

export function DashboardPage() {
  const { organizer } = useAuth();
  const { data, error, isLoading, refetch } = useDashboard();
  const [shareOpen, setShareOpen] = useState(false);
  const hasTournaments = data ? data.tournaments.length > 0 : undefined;
  const { showWelcome, dismissWelcome } = useOnboarding(hasTournaments);

  const activeTournaments = useMemo(
    () => (data?.tournaments ?? []).filter((t) => t.status === 'RUNNING'),
    [data?.tournaments]
  );
  const activeTournament = activeTournaments[0] ?? null;
  const activeCount = activeTournaments.length;
  const finishedOrRunning = useMemo(
    () =>
      (data?.tournaments ?? []).filter(
        (t) => t.status === 'FINISHED' || t.status === 'RUNNING'
      ),
    [data?.tournaments]
  );

  const estimatedProfit = useMemo(() => {
    if (!data) return 0;
    return Math.max(data.metrics.totalCollectedThisMonth - data.metrics.totalPrizePaid, 0);
  }, [data]);

  const totalPlayers = useMemo(
    () => (data?.tournaments ?? []).reduce((acc, t) => acc + t.playerCount, 0),
    [data?.tournaments]
  );

  const insights = useMemo(() => {
    if (!data || data.tournaments.length === 0) {
      return [
        'Seu painel está pronto para o próximo torneio.',
        'Comece um evento para liberar novos insights operacionais.',
      ];
    }

    const maxPlayers = Math.max(...data.tournaments.map((t) => t.playerCount));
    const avgPlayers =
      data.tournaments.reduce((sum, t) => sum + t.playerCount, 0) / data.tournaments.length;
    const avgProfit =
      data.tournaments.length > 0 ? estimatedProfit / data.tournaments.length : 0;

    return [
      `Seu maior torneio teve ${maxPlayers} jogador${maxPlayers === 1 ? '' : 'es'}.`,
      `Média por evento: ${avgPlayers.toFixed(1).replace('.', ',')} jogadores.`,
      `Lucro médio estimado: ${formatCurrency(avgProfit)}.`,
    ];
  }, [data, estimatedProfit]);

  if (showWelcome) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-md flex-col justify-center gap-4 py-6">
        <h1 className="font-display text-3xl text-white">
          Vamos organizar seu primeiro torneio?
        </h1>
        <p className="text-sm text-gray-300">
          Você cria, adiciona jogadores e acompanha tudo em tempo real.
        </p>
        <Link
          to="/app/new"
          className="flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-4 text-base font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          Criar torneio agora
        </Link>
        <button
          type="button"
          onClick={dismissWelcome}
          className="h-10 rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-semibold text-gray-100 transition hover:bg-gray-800"
        >
          Explorar primeiro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <h1 className="font-display text-3xl text-white">
          {`Boa noite, ${organizer?.name ?? 'Organizador'}.`}
        </h1>
        <p className="text-sm text-gray-300">Resumo da sua operação</p>
        {activeCount > 0 && (
          <p className="text-xs font-medium text-emerald-300">
            Você tem {activeCount} torneio{activeCount === 1 ? '' : 's'} em andamento.
          </p>
        )}
      </header>

      {isLoading && <DashboardSkeleton />}

      {error && (
        <GuidedErrorCard
          error={parseGuidedSystemErrorText(error)}
          onRetry={refetch}
        />
      )}

      {!isLoading && data && (
        <>
          <section className="rounded-2xl border border-gray-800 bg-[#0b1222] p-4">
            {activeTournament ? (
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                  Torneio em andamento
                </div>
                <div className="space-y-1">
                  <p className="truncate text-lg font-semibold text-white">
                    {activeTournament.name}
                  </p>
                  <p className="text-sm text-gray-300">
                    {activeTournament.playerCount} jogador
                    {activeTournament.playerCount === 1 ? '' : 'es'} ·{' '}
                    {formatDate(activeTournament.startedAt ?? activeTournament.createdAt)}
                  </p>
                </div>
                <Link
                  to={`/app/tournament/${activeTournament.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
                >
                  Continuar torneio
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-200">
                  Nenhum torneio ativo
                </div>
                <p className="text-sm text-gray-300">
                  Inicie um novo evento para acompanhar resultados e financeiro ao vivo.
                </p>
                <Link
                  to="/app/new"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
                >
                  Criar torneio agora
                </Link>
              </div>
            )}
          </section>

          <section className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-2.5">
              <CompactKpiCard
                icon="R$"
                label="Arrecadado no mês"
                value={formatCurrency(data.metrics.totalCollectedThisMonth)}
                subtitle="Receita bruta"
              />
              <CompactKpiCard
                icon="PP"
                label="Prêmios pagos"
                value={formatCurrency(data.metrics.totalPrizePaid)}
                subtitle="Eventos finalizados"
              />
              <CompactKpiCard
                icon="%"
                label="Seu lucro estimado"
                value={formatCurrency(estimatedProfit)}
                subtitle="No mês atual"
              />
              <CompactKpiCard
                icon="JG"
                label="Total de jogadores"
                value={`${totalPlayers}`}
                subtitle="Eventos visíveis"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-[#0b1222] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-300">
              Insights da operação
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-200">
              {insights.map((line) => (
                <li key={line} className="leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-white">Torneios recentes</h2>
              {organizer?.publicSlug && (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="h-9 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-semibold text-gray-100 transition hover:bg-gray-800"
                >
                  Compartilhar perfil
                </button>
              )}
            </div>

            {data.tournaments.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-[#0b1222] px-4 py-4 text-sm text-gray-300">
                Nenhum torneio encontrado.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.tournaments.map((t) => {
                  const actionLabel =
                    t.status === 'RUNNING'
                      ? 'Continuar'
                      : t.status === 'FINISHED'
                        ? 'Ver resultado'
                        : 'Ver detalhes';
                  const actionHref =
                    t.status === 'RUNNING'
                      ? `/app/tournament/${t.id}`
                      : t.status === 'FINISHED'
                        ? `/app/tournament/${t.id}/history`
                        : `/app/tournament/${t.id}`;

                  return (
                    <article
                      key={t.id}
                      className="rounded-xl border border-gray-800 bg-[#0b1222] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                          <p className="text-xs text-gray-400">
                            {formatDate(t.startedAt ?? t.createdAt)} · {t.playerCount} jogador
                            {t.playerCount === 1 ? '' : 'es'}
                          </p>
                        </div>
                        <StatusBadge
                          status={t.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'}
                        />
                      </div>
                      <div className="mt-2.5 flex justify-end">
                        <Link
                          to={actionHref}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-3 text-xs font-semibold text-gray-100 transition hover:bg-gray-800"
                        >
                          {actionLabel}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {(data.pagination.hasMore || finishedOrRunning.length > 0) && (
              <Link
                to="/app/tournaments"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-3 text-xs font-semibold text-gray-100 transition hover:bg-gray-800"
              >
                Ver todos os torneios ({data.pagination.total})
              </Link>
            )}
          </section>

          {organizer?.publicSlug && (
            <ProfileShareDrawer
              open={shareOpen}
              slug={organizer.publicSlug}
              organizerName={organizer.name}
              onClose={() => setShareOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

function CompactKpiCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: string;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="w-[220px] rounded-xl border border-gray-800 bg-[#0b1222] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-white">
        <span className="text-xs text-emerald-300">{icon}</span>
        {value}
      </p>
      <p className="text-[11px] text-gray-500">{subtitle}</p>
    </article>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}
