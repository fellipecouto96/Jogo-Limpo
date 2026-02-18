import type { TournamentStatistics } from '../types.ts';

interface TournamentStatsProps {
  stats: TournamentStatistics;
}

export function TournamentStats({ stats }: TournamentStatsProps) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0b1120] p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-400">
        Resumo do Torneio
      </h3>
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Jogadores"
          value={stats.playerCount.toString()}
        />
        <StatCard
          label="Partidas"
          value={`${stats.completedMatches}/${stats.totalMatches}`}
        />
        <StatCard
          label="Total de jogos"
          value={stats.totalGames > 0 ? stats.totalGames.toString() : '-'}
        />
        {stats.averageScorePerMatch > 0 && (
          <StatCard
            label="Média por partida"
            value={stats.averageScorePerMatch.toFixed(1)}
          />
        )}
      </div>

      {stats.finalScore && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-2">
            Placar da Final
          </p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold">
            <span className={stats.finalScore.score1 > stats.finalScore.score2 ? 'text-emerald-300' : 'text-gray-300'}>
              {stats.finalScore.player1}
            </span>
            <span className="text-3xl tabular-nums">
              <span className={stats.finalScore.score1 > stats.finalScore.score2 ? 'text-emerald-400' : 'text-white'}>
                {stats.finalScore.score1}
              </span>
              <span className="text-gray-500 mx-2">×</span>
              <span className={stats.finalScore.score2 > stats.finalScore.score1 ? 'text-emerald-400' : 'text-white'}>
                {stats.finalScore.score2}
              </span>
            </span>
            <span className={stats.finalScore.score2 > stats.finalScore.score1 ? 'text-emerald-300' : 'text-gray-300'}>
              {stats.finalScore.player2}
            </span>
          </div>
        </div>
      )}

      {stats.highestScoringPlayer && (
        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-1">
            Maior pontuador
          </p>
          <p className="text-lg font-semibold text-white">
            {stats.highestScoringPlayer.name}
            <span className="ml-2 text-emerald-400">
              {stats.highestScoringPlayer.totalScore} pontos
            </span>
          </p>
        </div>
      )}

      {stats.biggestWinMargin && (
        <div className="mt-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-1">
            Maior goleada
          </p>
          <p className="text-base text-white">
            {stats.biggestWinMargin.winner} sobre {stats.biggestWinMargin.loser}
            <span className="ml-2 text-amber-400">
              (+{stats.biggestWinMargin.margin})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-800/50 p-3 text-center">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}
