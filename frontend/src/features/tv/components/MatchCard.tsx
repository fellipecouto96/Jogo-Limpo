import { memo } from 'react';
import type { BracketMatch, BracketPlayer } from '../types.ts';

interface MatchCardProps {
  match: BracketMatch | null;
}

export const MatchCard = memo(function MatchCard({ match }: MatchCardProps) {
  if (!match) {
    return (
      <div className="bg-[#0C0A09]/70 border border-white/5 rounded-2xl p-4 min-w-48">
        <PlayerSlot player={null} isWinner={false} isEliminated={false} />
        <div className="border-t border-gray-600 my-1" />
        <PlayerSlot player={null} isWinner={false} isEliminated={false} />
      </div>
    );
  }

  if (match.isBye) {
    return (
      <div className="rounded-2xl p-4 min-w-48 border border-amber-500/30 bg-[#0C0A09]/70 shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
        <PlayerSlot player={match.player1} isWinner={true} isEliminated={false} />
        <div className="border-t border-gray-600 my-1" />
        <div className="py-1 px-2 text-gray-600 text-sm italic">Avançou automaticamente</div>
      </div>
    );
  }

  const isComplete = match.winner !== null;
  const hasScores = match.player1Score !== null && match.player2Score !== null;

  return (
    <div
      className={[
        'rounded-2xl p-4 min-w-48 border transition-all duration-500',
        isComplete
          ? 'bg-[#0C0A09]/60 border-white/15 shadow-[0_15px_30px_rgba(0,0,0,0.45)]'
          : 'bg-[#0C0A09]/80 border-emerald-400/50 shadow-[0_25px_60px_rgba(0,0,0,0.55)]',
      ].join(' ')}
    >
      <PlayerSlot
        player={match.player1}
        score={match.player1Score}
        isWinner={isComplete && match.winner?.id === match.player1.id}
        isEliminated={isComplete && match.winner?.id !== match.player1.id}
        showScore={hasScores}
      />
      <div className="border-t border-gray-600 my-1" />
      <PlayerSlot
        player={match.player2}
        score={match.player2Score}
        isWinner={isComplete && match.winner?.id === match.player2?.id}
        isEliminated={isComplete && match.winner?.id !== match.player2?.id}
        showScore={hasScores}
      />
    </div>
  );
});

interface PlayerSlotProps {
  player: BracketPlayer | null;
  score?: number | null;
  isWinner: boolean;
  isEliminated: boolean;
  showScore?: boolean;
}

function PlayerSlot({ player, score, isWinner, isEliminated, showScore = false }: PlayerSlotProps) {
  if (!player) {
    return <div className="py-1 px-2 text-gray-600 text-lg">TBD</div>;
  }

  const classes = [
    'py-1.5 px-3 text-lg font-semibold rounded-xl transition-all duration-300 bg-white/5 flex items-center justify-between gap-2',
    isWinner &&
      'text-emerald-200 font-bold bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.4)]',
    isEliminated && 'text-gray-600 bg-transparent',
    !isWinner && !isEliminated && 'text-gray-100',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <span className={isEliminated ? 'line-through' : ''}>
        {isWinner && (
          <span className="mr-1" aria-label="vencedor">
            &#9654;
          </span>
        )}
        {player.name}
      </span>
      {showScore && score !== null && (
        <span className={`text-xl font-bold tabular-nums ${isWinner ? 'text-emerald-400' : 'text-gray-500'}`}>
          {score}
        </span>
      )}
    </div>
  );
}
