import { useMemo } from 'react';
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

  const runnerUp = useMemo(() => {
    if (!bracket || bracket.totalRounds === 0) return null;
    const finalRound = bracket.rounds[bracket.totalRounds - 1];
    if (!finalRound || finalRound.matches.length !== 1) return null;
    const finalMatch: BracketMatch = finalRound.matches[0];
    if (!finalMatch.winner) return null;
    return finalMatch.winner.id === finalMatch.player1.id
      ? finalMatch.player2
      : finalMatch.player1;
  }, [bracket]);

  if (isLoading) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">Carregando...</p>
    );
  }

  if (error && !details && !bracket) {
    return <p className="text-red-400 text-center py-12">{error}</p>;
  }

  if (!bracket) return null;

  const { tournament, rounds, totalRounds, champion } = bracket;
  const hasFinancials = !!details && (details.totalCollected ?? 0) > 0;

  return (
    <div className="animate-[fadeIn_0.4s_ease-out]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: slideUp 0.5s ease-out 0.1s both; }
        .stagger-2 { animation: slideUp 0.5s ease-out 0.2s both; }
        .stagger-3 { animation: slideUp 0.5s ease-out 0.3s both; }
        .stagger-4 { animation: slideUp 0.5s ease-out 0.4s both; }
      `}</style>

      {/* Back link */}
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </Link>

      {/* Title section */}
      <div className="stagger-1 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
          <h1 className="font-display text-4xl text-white tracking-tight">
            {tournament.name}
          </h1>
          <StatusBadge status={tournament.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'} />
        </div>
        <p className="text-gray-500 text-sm">
          {tournament.startedAt && formatDateFull(tournament.startedAt)}
          {tournament.finishedAt && tournament.startedAt && ' — '}
          {tournament.finishedAt && formatDateFull(tournament.finishedAt)}
        </p>
      </div>

      {/* Champion & Runner-up */}
      {champion && (
        <div className="stagger-2 mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-gray-900 to-gray-900 p-8">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row gap-8">
              {/* Champion */}
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-amber-500/70 font-semibold mb-2">
                  Campeao
                </p>
                <p className="text-3xl font-display text-amber-400 tracking-tight">
                  {champion.name}
                </p>
              </div>
              {/* Runner-up */}
              {runnerUp && (
                <div className="flex-1 sm:border-l sm:border-gray-800 sm:pl-8">
                  <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">
                    Vice-campeao
                  </p>
                  <p className="text-2xl font-display text-gray-400 tracking-tight">
                    {runnerUp.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="stagger-3 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <InfoTile label="Organizador" value={details?.organizerName ?? '—'} />
        <InfoTile label="Jogadores" value={String(details?.playerCount ?? '—')} />
        <InfoTile
          label="Premiacao"
          value={
            hasFinancials
              ? formatCurrency(details!.prizePool ?? 0)
              : '—'
          }
          accent={hasFinancials}
        />
        <InfoTile
          label="Seed do sorteio"
          value={details?.drawSeed ?? '—'}
          mono
        />
      </div>

      {/* Financial breakdown */}
      {hasFinancials && details && (
        <div className="stagger-3 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-gray-500 font-semibold mb-4">
              Distribuicao financeira
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Taxa de inscricao</span>
                <span className="text-white font-medium">
                  {formatCurrency(details.entryFee ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total arrecadado</span>
                <span className="text-white font-medium">
                  {formatCurrency(details.totalCollected ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">
                  Organizador ({details.organizerPercentage ?? 0}%)
                </span>
                <span className="text-amber-400 font-medium">
                  {formatCurrency(details.organizerAmount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">1o lugar ({details.firstPlacePercentage ?? 0}%)</span>
                <span className="text-yellow-300 font-medium">
                  {formatCurrency(details.firstPlacePrize ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">2o lugar ({details.secondPlacePercentage ?? 0}%)</span>
                <span className="text-gray-300 font-medium">
                  {formatCurrency(details.secondPlacePrize ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full bracket */}
      {totalRounds > 0 && (
        <div className="stagger-4">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-semibold mb-4">
            Chave completa
          </h2>
          <div
            className="grid gap-4 items-center w-full overflow-x-auto pb-4"
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
    </div>
  );
}

function InfoTile({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">
        {label}
      </p>
      <p
        className={[
          'text-lg font-bold truncate',
          mono && 'font-mono text-base',
          accent ? 'text-emerald-400' : 'text-white',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </p>
    </div>
  );
}
