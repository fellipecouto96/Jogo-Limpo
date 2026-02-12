import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTournamentDetails } from './useTournamentDetails.ts';
import { useBracketData } from '../tv/useBracketData.ts';
import { BracketRound } from '../tv/components/BracketRound.tsx';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import type { BracketMatch } from '../tv/types.ts';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function TournamentHistoryPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const {
    data: details,
    error: detailsError,
    isLoading: detailsLoading,
  } = useTournamentDetails(tournamentId!);
  const {
    data: bracket,
    error: bracketError,
    isLoading: bracketLoading,
  } = useBracketData(tournamentId!);

  const isLoading = detailsLoading || bracketLoading;
  const error = detailsError || bracketError;

  const finalMatch = useMemo<BracketMatch | null>(() => {
    if (!bracket || bracket.totalRounds === 0) return null;
    const finalRound = bracket.rounds[bracket.totalRounds - 1];
    return finalRound?.matches.length === 1 ? finalRound.matches[0] : null;
  }, [bracket]);

  const computedRunnerUp = useMemo(() => {
    if (!finalMatch || !finalMatch.winner || !finalMatch.player2) return null;
    return finalMatch.winner.id === finalMatch.player1.id
      ? finalMatch.player2
      : finalMatch.player1;
  }, [finalMatch]);

  if (isLoading) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">Carregando...</p>
    );
  }

  if (error && !details && !bracket) {
    return <p className="text-red-400 text-center py-12">{error}</p>;
  }

  if (!bracket) return null;

  const { tournament, rounds, totalRounds, champion: bracketChampion } = bracket;
  const champion =
    details?.champion ??
    (bracketChampion
      ? { id: bracketChampion.id, name: bracketChampion.name }
      : null);
  const runnerUp =
    details?.runnerUp ??
    (computedRunnerUp
      ? { id: computedRunnerUp.id, name: computedRunnerUp.name }
      : null);
  const hasFinancials = !!details && (details.totalCollected ?? 0) > 0;

  return (
    <div className="animate-[fadeIn_0.4s_ease-out] space-y-8">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </Link>

      <header className="rounded-3xl border border-white/5 bg-gradient-to-r from-[#0b1120] via-[#111827] to-[#020617] p-6 lg:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300 font-semibold">
              Relatorio oficial
            </p>
            <h1 className="font-display text-4xl text-white tracking-tight mt-2">
              {tournament.name}
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              {formatDateRange(tournament.startedAt, tournament.finishedAt)}
            </p>
          </div>
          <StatusBadge status={tournament.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'} />
        </div>
      </header>

      {/* Section 1 – Basic Info */}
      <SectionCard title="Informacoes basicas" subtitle="Visao geral do torneio" accent="amber">
        <div className="grid gap-4 min-[500px]:grid-cols-2 lg:grid-cols-4">
          <InfoStat label="Organizador" value={details?.organizerName ?? '—'} />
          <InfoStat label="Data" value={formatDateRange(tournament.startedAt, tournament.finishedAt)} />
          <InfoStat label="Jogadores" value={`${details?.playerCount ?? 0}`} />
          <InfoStat label="Status" value={tournament.status} />
        </div>
      </SectionCard>

      {/* Section 2 – Results */}
      <SectionCard title="Resultados" subtitle="Resumo esportivo e chave completa" accent="emerald">
        <div className="grid gap-4 lg:grid-cols-3">
          <ResultTile
            label="Campeao"
            value={champion?.name ?? '—'}
            highlight
            helper={details?.firstPlacePrize != null ? formatCurrency(details.firstPlacePrize) : undefined}
          />
          <ResultTile
            label="Vice-campeao"
            value={runnerUp?.name ?? '—'}
            helper={
              details?.secondPlacePrize != null
                ? formatCurrency(details.secondPlacePrize)
                : undefined
            }
          />
          <FinalMatchCard match={finalMatch} />
        </div>

        {totalRounds > 0 && (
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold mb-2">
              Chave completa (somente leitura)
            </h3>
            <div
              className="grid gap-4 items-center w-full overflow-x-auto pb-4 rounded-2xl bg-white/5 border border-white/10 p-4"
              style={{
                gridTemplateColumns: `repeat(${totalRounds}, minmax(220px, 1fr))`,
              }}
            >
              {rounds.map((round) => (
                <BracketRound
                  key={round.id}
                  round={round}
                  totalRounds={totalRounds}
                  isLastRound={round.roundNumber === totalRounds}
                />
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 3 – Financial Summary */}
      <SectionCard title="Resumo financeiro" subtitle="Distribuicao oficial e transparencia" accent="gold">
        <div className="grid gap-4 min-[500px]:grid-cols-2 lg:grid-cols-3">
          <InfoStat label="Taxa de inscricao" value={formatCurrency(details?.entryFee ?? 0)} />
          <InfoStat label="Total arrecadado" value={formatCurrency(details?.totalCollected ?? 0)} />
          <InfoStat
            label={`Organizador (${details?.organizerPercentage ?? 0}%)`}
            value={formatCurrency(details?.organizerAmount ?? 0)}
          />
          <InfoStat label="Premiacao liquida" value={formatCurrency(details?.prizePool ?? 0)} />
          <InfoStat
            label={`1º lugar (${details?.firstPlacePercentage ?? 0}%)`}
            value={formatCurrency(details?.firstPlacePrize ?? 0)}
          />
          <InfoStat
            label={`2º lugar (${details?.secondPlacePercentage ?? 0}%)`}
            value={formatCurrency(details?.secondPlacePrize ?? 0)}
          />
        </div>
      </SectionCard>

      {/* Section 4 – Transparency */}
      <SectionCard title="Transparencia" subtitle="Auditoria do sorteio" accent="slate">
        <div className="grid gap-4 min-[500px]:grid-cols-2">
          <KeyValue label="Seed utilizado" value={details?.drawSeed ?? '—'} />
          <KeyValue label="Gerado em" value={formatDateTime(details?.startedAt)} />
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  accent: 'amber' | 'emerald' | 'gold' | 'slate';
}) {
  const accentColors: Record<string, string> = {
    amber: 'from-amber-500/10 via-[#0b1120] to-[#05060c]',
    emerald: 'from-emerald-500/10 via-[#0b1120] to-[#05060c]',
    gold: 'from-[#fbbf24]/10 via-[#0b1120] to-[#05060c]',
    slate: 'from-[#94a3b8]/10 via-[#0b1120] to-[#05060c]',
  };
  return (
    <section className={`rounded-3xl border border-white/5 bg-gradient-to-br ${accentColors[accent]} p-6 lg:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]`}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
          {title}
        </p>
        <p className="text-gray-300 mt-1 text-sm">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.4em] text-gray-500 font-semibold mb-2">
        {label}
      </p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ResultTile({
  label,
  value,
  helper,
  highlight,
}: {
  label: string;
  value: string;
  helper?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl border px-4 py-5',
        highlight
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-50 shadow-[0_15px_40px_rgba(16,185,129,0.25)]'
          : 'border-white/10 bg-white/5 text-gray-100',
      ].join(' ')}
    >
      <p className="text-[11px] uppercase tracking-[0.4em] opacity-70 font-semibold">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      {helper && <p className="text-sm text-white/80 mt-1">{helper}</p>}
    </div>
  );
}

function FinalMatchCard({ match }: { match: BracketMatch | null }) {
  const matchup = match
    ? `${match.player1.name} vs ${match.player2?.name ?? 'TBD'}`
    : 'Sem dados';
  const result = match?.winner
    ? `${match.winner.name} venceu`
    : 'Resultado nao registrado';
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-gray-100">
      <p className="text-[11px] uppercase tracking-[0.4em] opacity-70 font-semibold">
        Final
      </p>
      <p className="text-lg font-semibold mt-2">{matchup}</p>
      <p className="text-sm text-gray-300 mt-1">{result}</p>
      <p className="text-xs text-gray-500 mt-3">Placar final</p>
      <p className="text-xl font-semibold text-white">Indisponivel</p>
      {match?.finishedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Disputada em {formatDateTime(match.finishedAt)}
        </p>
      )}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.4em] text-gray-500 font-semibold">
        {label}
      </p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  const startText = start ? formatDateFull(start) : null;
  const endText = end ? formatDateFull(end) : null;
  if (startText && endText) {
    return `${startText} — ${endText}`;
  }
  return startText ?? endText ?? '—';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
