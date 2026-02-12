import { Link, useParams } from 'react-router-dom';
import { useManageBracket } from './useManageBracket.ts';
import { ManageBracketRound } from './components/ManageBracketRound.tsx';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { useTournamentDetails } from './useTournamentDetails.ts';
import type { BracketPlayer, BracketRound } from '../tv/types.ts';

export function ManageTournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error, isLoading, refetch } = useManageBracket(
    tournamentId!
  );
  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError,
  } = useTournamentDetails(tournamentId!);

  if (isLoading) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">
        Carregando...
      </p>
    );
  }

  if (error && !data) {
    return (
      <p className="text-red-400 text-center py-12">{error}</p>
    );
  }

  if (!data) return null;

  const { tournament, rounds, totalRounds, champion: bracketChampion } = data;
  const runnerUpFromBracket = deriveRunnerUp(rounds, totalRounds);
  const champion = details?.champion ?? bracketChampion;
  const runnerUp = details?.runnerUp ?? runnerUpFromBracket;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl text-white">
            {tournament.name}
          </h1>
          <StatusBadge status={tournament.status} />
        </div>
        <div className="flex gap-2">
          <Link
            to={`/tournament/${tournamentId}/tv`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            TV Mode
          </Link>
          <Link
            to={`/tournament/${tournamentId}/mobile`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Mobile
          </Link>
          <Link
            to={`/app/tournament/${tournamentId}/settings`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            Financeiro
          </Link>
          {tournament.status === 'FINISHED' && (
            <Link
              to={`/app/tournament/${tournamentId}/history`}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              Historico
            </Link>
          )}
        </div>
      </div>

      {/* Winners panel */}
      {tournament.status === 'FINISHED' && (
        <div className="mb-6">
          <WinnersPanel
            isLoading={detailsLoading && !details}
            champion={champion}
            runnerUp={runnerUp}
            firstPrize={details?.firstPlacePrize ?? null}
            secondPrize={details?.secondPlacePrize ?? null}
            totalPrize={details?.prizePool ?? null}
            error={detailsError ?? null}
          />
        </div>
      )}

      {/* Bracket */}
      {totalRounds > 0 && (
        <div
          className="grid gap-4 items-center w-full overflow-x-auto pb-4"
          style={{
            gridTemplateColumns: `repeat(${totalRounds}, minmax(220px, 1fr))`,
          }}
        >
          {rounds.map((round) => (
            <ManageBracketRound
              key={round.id}
              round={round}
              totalRounds={totalRounds}
              isLastRound={round.roundNumber === totalRounds}
              tournamentId={tournamentId!}
              tournamentStatus={tournament.status}
              onResultRecorded={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WinnersPanel({
  isLoading,
  champion,
  runnerUp,
  totalPrize,
  firstPrize,
  secondPrize,
  error,
}: {
  isLoading: boolean;
  champion: BracketPlayer | { id: string; name: string } | null;
  runnerUp: BracketPlayer | { id: string; name: string } | null;
  totalPrize: number | null;
  firstPrize: number | null;
  secondPrize: number | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/5 bg-[#05060c] p-6 animate-pulse text-gray-500">
        Calculando vencedores...
      </div>
    );
  }

  if (!champion) {
    return (
      <div className="rounded-3xl border border-white/5 bg-[#05060c] p-6 text-gray-400">
        Nenhum campeao registrado ainda.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1120] via-[#111827] to-[#020617] p-6 lg:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 -right-16 w-60 h-60 bg-emerald-500/20 blur-[100px]" />
        <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-amber-500/10 blur-[80px]" />
      </div>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300 font-semibold mb-2">
            Campeao
          </p>
          <p className="text-3xl lg:text-4xl font-display text-white">
            {champion.name}
          </p>
          {totalPrize != null && (
            <p className="mt-2 text-sm text-gray-400">
              Premiacao liquida: <span className="text-emerald-300 font-semibold">{formatCurrency(totalPrize)}</span>
            </p>
          )}
        </div>
        <div className="flex-1 grid gap-4 lg:grid-cols-2">
          <PrizeCard
            title="1º lugar"
            amount={firstPrize ?? totalPrize ?? 0}
            subtitle={champion.name}
            accent="emerald"
          />
          <PrizeCard
            title="2º lugar"
            amount={secondPrize ?? 0}
            subtitle={runnerUp?.name ?? '—'}
            accent="slate"
          />
        </div>
      </div>
      {runnerUp && (
        <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
              Vice-campeao
            </p>
            <p className="text-lg font-semibold text-gray-100">{runnerUp.name}</p>
          </div>
          {secondPrize != null && (
            <p className="text-sm text-gray-300">
              {formatCurrency(secondPrize)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PrizeCard({
  title,
  amount,
  subtitle,
  accent,
}: {
  title: string;
  amount: number;
  subtitle: string;
  accent: 'emerald' | 'slate';
}) {
  const styles =
    accent === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50'
      : 'border-white/10 bg-white/5 text-gray-200';
  return (
    <div className={`rounded-2xl border px-4 py-4 ${styles}`}>
      <p className="text-[11px] uppercase tracking-[0.4em] opacity-70 font-semibold">
        {title}
      </p>
      <p className="text-2xl font-semibold mt-2">{formatCurrency(amount)}</p>
      <p className="text-sm text-white/80 mt-1">{subtitle}</p>
    </div>
  );
}

function formatCurrency(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'R$\u00a00,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function deriveRunnerUp(rounds: BracketRound[], totalRounds: number) {
  if (totalRounds === 0) return null;
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound || finalRound.matches.length !== 1) return null;
  const finalMatch = finalRound.matches[0];
  if (!finalMatch.winner || !finalMatch.player2) return null;
  return finalMatch.winner.id === finalMatch.player1.id
    ? finalMatch.player2
    : finalMatch.player1;
}
