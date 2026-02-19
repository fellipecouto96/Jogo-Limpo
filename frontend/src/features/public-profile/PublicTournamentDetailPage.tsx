import { useParams, Link } from 'react-router-dom';
import { usePublicTournament } from './usePublicProfile.ts';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { MobileRound } from '../tv/components/MobileRound.tsx';
import { ChampionBanner } from '../tv/components/ChampionBanner.tsx';
import { PublicBadge } from './PublicBadge.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';
import { ProgressiveLoadingMessage } from '../../shared/ProgressiveLoadingMessage.tsx';

export function PublicTournamentDetailPage() {
  const { tournamentSlug } = useParams<{ tournamentSlug: string }>();
  const { data, error, isLoading, refetch } = usePublicTournament(tournamentSlug!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <ProgressiveLoadingMessage
          initialMessage="Carregando torneio"
          className="text-white text-lg min-h-7"
        />
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center text-sm text-gray-400 hover:text-white transition"
        >
          &larr; Voltar para a pagina principal
        </Link>

        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold">
              {tournament.name}
            </h1>
            <StatusBadge
              status={tournament.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'}
            />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {tournament.playerCount} jogador{tournament.playerCount === 1 ? '' : 'es'}
            {' · '}
            {formatDate(tournament.startedAt ?? tournament.createdAt)}
          </p>
        </header>

        {isFinished && bracket.champion && (
          <ChampionBanner
            champion={bracket.champion}
            runnerUp={runnerUp}
            stats={statistics}
          />
        )}

        {/* Statistics */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Estatisticas
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatItem label="Partidas" value={`${statistics.completedMatches}/${statistics.totalMatches}`} />
            <StatItem label="Games jogados" value={String(statistics.totalGames)} />
            {statistics.highestScoringPlayer && (
              <StatItem
                label="Maior pontuador"
                value={`${statistics.highestScoringPlayer.name} (${statistics.highestScoringPlayer.totalScore})`}
              />
            )}
            {statistics.biggestWinMargin && (
              <StatItem
                label="Maior margem"
                value={`${statistics.biggestWinMargin.winner} (+${statistics.biggestWinMargin.margin})`}
              />
            )}
            {statistics.finalScore && (
              <StatItem
                label="Placar final"
                value={`${statistics.finalScore.player1} ${statistics.finalScore.score1} x ${statistics.finalScore.score2} ${statistics.finalScore.player2}`}
              />
            )}
          </div>
        </div>

        {/* Bracket */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
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

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-semibold text-white">{value}</p>
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

function deriveRunnerUp(
  rounds: { matches: { winner: { id: string; name: string } | null; player1: { id: string; name: string }; player2: { id: string; name: string } | null }[] }[],
  totalRounds: number
) {
  if (totalRounds === 0) return null;
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound || finalRound.matches.length !== 1) return null;
  const finalMatch = finalRound.matches[0];
  if (!finalMatch.winner || !finalMatch.player2) return null;
  return finalMatch.winner.id === finalMatch.player1.id
    ? finalMatch.player2
    : finalMatch.player1;
}
