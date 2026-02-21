import { useParams, Link } from 'react-router-dom';
import { usePublicTournament } from './usePublicProfile.ts';
import { MobileRound } from '../tv/components/MobileRound.tsx';
import { PublicBadge } from './PublicBadge.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';
import { TournamentPageSkeleton } from '../../shared/loading/LoadingSystem.tsx';

export function PublicTournamentDetailPage() {
  const { tournamentSlug } = useParams<{ tournamentSlug: string }>();
  const { data, error, isLoading, refetch } = usePublicTournament(tournamentSlug!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <TournamentPageSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const guidedError = error ?? resolveGuidedSystemError({ context: 'public_link' });
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="mx-auto w-full max-w-lg">
          <GuidedErrorCard error={guidedError} onRetry={refetch} />
        </div>
      </div>
    );
  }

  const { tournament, bracket, statistics } = data;
  const isFinished = tournament.status === 'FINISHED';

  const runnerUp =
    isFinished && bracket.totalRounds > 0
      ? deriveRunnerUp(bracket.rounds, bracket.totalRounds)
      : null;

  const thirdAndFourth = isFinished && bracket.totalRounds > 0
    ? deriveThirdAndFourth(bracket.rounds, bracket.totalRounds)
    : { thirdPlace: null, fourthPlace: null };

  const hasPrizePool = (tournament.prizePool ?? 0) > 0;
  const shareUrl = window.location.href;

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: tournament.name,
          text: `Resultado oficial do torneio ${tournament.name}`,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center text-sm text-gray-400 hover:text-white transition"
        >
          &larr; Voltar para a página principal
        </Link>

        {/* Hero Result Block */}
        {isFinished && bracket.champion && (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 via-gray-900 to-gray-950 p-5 shadow-[0_20px_60px_rgba(16,185,129,0.12)]">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/70">
              Resultado Oficial
            </p>
            <p className="mt-2 text-center text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              🏆 Campeão
            </p>
            <p className="mt-1 text-center font-display text-3xl font-bold text-emerald-200 sm:text-4xl">
              {bracket.champion.name}
            </p>

            {runnerUp && (
              <p className="mt-3 text-center text-base text-gray-300">
                Vice: <span className="font-semibold text-gray-100">{runnerUp.name}</span>
              </p>
            )}
            {thirdAndFourth.thirdPlace && (tournament.thirdPlacePrize ?? 0) > 0 && (
              <p className="mt-1 text-center text-base text-gray-300">
                3º lugar: <span className="font-semibold text-gray-100">{thirdAndFourth.thirdPlace.name}</span>
              </p>
            )}
            {thirdAndFourth.fourthPlace && (tournament.fourthPlacePrize ?? 0) > 0 && (
              <p className="mt-1 text-center text-base text-gray-300">
                4º lugar: <span className="font-semibold text-gray-100">{thirdAndFourth.fourthPlace.name}</span>
              </p>
            )}

            <p className="mt-3 text-center text-xs text-gray-400">
              {tournament.playerCount} jogadores · {formatDate(tournament.finishedAt ?? tournament.startedAt ?? tournament.createdAt)}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => { void handleShare(); }}
                className="flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 [touch-action:manipulation]"
              >
                Compartilhar resultado
              </button>
              <button
                type="button"
                onClick={() => { void handleCopyLink(); }}
                className="flex h-11 items-center justify-center rounded-xl border border-gray-600 bg-gray-800 px-5 text-sm font-semibold text-gray-100 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/40 [touch-action:manipulation]"
              >
                Copiar link
              </button>
            </div>
          </div>
        )}

        {/* Prize Grid */}
        {hasPrizePool && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Premiação
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <PrizeCard
                emoji="🥇"
                label="Campeão"
                value={tournament.championPrize}
                tone="border-emerald-500/30 bg-emerald-500/10"
              />
              <PrizeCard
                emoji="🥈"
                label="Vice"
                value={tournament.runnerUpPrize}
                tone="border-gray-600 bg-white/5"
              />
              {(tournament.thirdPlacePrize ?? 0) > 0 && (
                <PrizeCard
                  emoji="🥉"
                  label="3º lugar"
                  value={tournament.thirdPlacePrize}
                  tone="border-amber-500/30 bg-amber-500/10"
                />
              )}
              {(tournament.fourthPlacePrize ?? 0) > 0 && (
                <PrizeCard
                  emoji="🎖"
                  label="4º lugar"
                  value={tournament.fourthPlacePrize}
                  tone="border-gray-700 bg-white/5"
                />
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Estatísticas
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatItem
              label="Total de partidas"
              value={`${statistics.completedMatches}/${statistics.totalMatches}`}
            />
            {statistics.totalGames > 0 && (
              <StatItem label="Total de games" value={String(statistics.totalGames)} />
            )}
            {(tournament.totalCollected ?? 0) > 0 && (
              <StatItem
                label="Total arrecadado"
                value={formatCurrency(tournament.totalCollected!)}
              />
            )}
            {(tournament.prizePool ?? 0) > 0 && (
              <StatItem
                label="Total em premiação"
                value={formatCurrency(tournament.prizePool!)}
              />
            )}
            {statistics.biggestWinMargin && (
              <StatItem
                label="Maior goleada"
                value={`${statistics.biggestWinMargin.winner} (+${statistics.biggestWinMargin.margin})`}
              />
            )}
            {statistics.highestScoringPlayer && (
              <StatItem
                label="Maior pontuador"
                value={`${statistics.highestScoringPlayer.name} (${statistics.highestScoringPlayer.totalScore} pts)`}
              />
            )}
          </div>
        </div>

        {/* Bracket */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Chaveamento
          </h2>
          <div className="flex flex-col gap-6">
            {bracket.rounds.map((round) => (
              <MobileRound
                key={round.id}
                round={round}
                totalRounds={bracket.totalRounds}
              />
            ))}
          </div>
        </div>

        {isFinished && <PublicBadge />}
      </div>
    </div>
  );
}

function PrizeCard({
  emoji,
  label,
  value,
  tone,
}: {
  emoji: string;
  label: string;
  value: number | null | undefined;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-300 opacity-80">
        {emoji} {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold text-white">
        {value != null ? formatCurrency(value) : '—'}
      </p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function deriveRunnerUp(
  rounds: {
    matches: {
      positionInBracket: number;
      winner: { id: string; name: string } | null;
      player1: { id: string; name: string };
      player2: { id: string; name: string } | null;
    }[];
  }[],
  totalRounds: number
) {
  if (totalRounds === 0) return null;
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound) return null;
  const finalMatch =
    finalRound.matches.find((match) => match.positionInBracket === 1) ??
    finalRound.matches[0];
  if (!finalMatch) return null;
  if (!finalMatch.winner || !finalMatch.player2) return null;
  return finalMatch.winner.id === finalMatch.player1.id
    ? finalMatch.player2
    : finalMatch.player1;
}

function deriveThirdAndFourth(
  rounds: {
    matches: {
      positionInBracket: number;
      winner: { id: string; name: string } | null;
      player1: { id: string; name: string };
      player2: { id: string; name: string } | null;
    }[];
  }[],
  totalRounds: number
): {
  thirdPlace: { id: string; name: string } | null;
  fourthPlace: { id: string; name: string } | null;
} {
  if (totalRounds === 0) return { thirdPlace: null, fourthPlace: null };
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound) return { thirdPlace: null, fourthPlace: null };
  const thirdPlaceMatch = finalRound.matches.find((m) => m.positionInBracket === 2);
  if (!thirdPlaceMatch || !thirdPlaceMatch.winner || !thirdPlaceMatch.player2) {
    return { thirdPlace: null, fourthPlace: null };
  }
  const thirdPlace =
    thirdPlaceMatch.winner.id === thirdPlaceMatch.player1.id
      ? thirdPlaceMatch.player1
      : thirdPlaceMatch.player2;
  const fourthPlace =
    thirdPlaceMatch.winner.id === thirdPlaceMatch.player1.id
      ? thirdPlaceMatch.player2
      : thirdPlaceMatch.player1;
  return { thirdPlace, fourthPlace };
}
