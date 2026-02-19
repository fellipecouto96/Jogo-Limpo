import { memo } from 'react';
import type { BracketPlayer, TournamentStatistics } from '../types.ts';

interface ChampionBannerProps {
  champion: BracketPlayer;
  runnerUp?: BracketPlayer | null;
  stats?: TournamentStatistics | null;
}

export const ChampionBanner = memo(function ChampionBanner({
  champion,
  runnerUp,
  stats,
}: ChampionBannerProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-4">
      <div className="inline-block bg-emerald-500/20 border border-emerald-500 rounded-xl px-8 py-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80 mb-2 text-center">
          Campeão
        </p>
        <p className="text-3xl font-bold text-emerald-400 text-center">
          🏆 {champion.name}
        </p>
        {runnerUp && (
          <p className="text-base text-gray-300 mt-2 text-center">
            Vice: <span className="font-semibold text-gray-100">{runnerUp.name}</span>
          </p>
        )}
        
        {stats?.finalScore && (
          <div className="mt-4 pt-4 border-t border-emerald-500/30">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/60 mb-2 text-center">
              Placar da Final
            </p>
            <div className="flex items-center justify-center gap-3 text-lg font-bold">
              <span className={stats.finalScore.score1 > stats.finalScore.score2 ? 'text-emerald-300' : 'text-gray-400'}>
                {stats.finalScore.player1}
              </span>
              <span className="text-2xl tabular-nums">
                <span className={stats.finalScore.score1 > stats.finalScore.score2 ? 'text-emerald-400' : 'text-white'}>
                  {stats.finalScore.score1}
                </span>
                <span className="text-gray-500 mx-1">×</span>
                <span className={stats.finalScore.score2 > stats.finalScore.score1 ? 'text-emerald-400' : 'text-white'}>
                  {stats.finalScore.score2}
                </span>
              </span>
              <span className={stats.finalScore.score2 > stats.finalScore.score1 ? 'text-emerald-300' : 'text-gray-400'}>
                {stats.finalScore.player2}
              </span>
            </div>
          </div>
        )}
      </div>

      {stats && (stats.totalGames > 0 || stats.playerCount > 0) && (
        <div className="rounded-xl border border-gray-700 bg-[#0b1120]/80 backdrop-blur-sm p-4 max-w-md w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 mb-3 text-center">
            Resumo do Torneio
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-white tabular-nums">{stats.playerCount}</p>
              <p className="text-xs text-gray-400">Jogadores</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white tabular-nums">{stats.completedMatches}</p>
              <p className="text-xs text-gray-400">Partidas</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white tabular-nums">{stats.totalGames || '-'}</p>
              <p className="text-xs text-gray-400">Jogos</p>
            </div>
          </div>
          
          {stats.highestScoringPlayer && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-center">
              <p className="text-xs text-gray-400">
                Maior pontuador:{' '}
                <span className="font-semibold text-emerald-400">
                  {stats.highestScoringPlayer.name} ({stats.highestScoringPlayer.totalScore} pts)
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
