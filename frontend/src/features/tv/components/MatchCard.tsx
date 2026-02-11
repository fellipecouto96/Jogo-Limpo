import type { BracketMatch, BracketPlayer } from '../types.ts';

interface MatchCardProps {
  match: BracketMatch | null;
}

export function MatchCard({ match }: MatchCardProps) {
  if (!match) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 min-w-48">
        <PlayerSlot player={null} isWinner={false} isEliminated={false} />
        <div className="border-t border-gray-700 my-1" />
        <PlayerSlot player={null} isWinner={false} isEliminated={false} />
      </div>
    );
  }

  const isComplete = match.winner !== null;

  return (
    <div
      className={[
        'rounded-lg p-3 min-w-48 border transition-colors',
        isComplete
          ? 'bg-gray-800 border-gray-600'
          : 'bg-gray-800 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      ].join(' ')}
    >
      <PlayerSlot
        player={match.player1}
        isWinner={isComplete && match.winner?.id === match.player1.id}
        isEliminated={isComplete && match.winner?.id !== match.player1.id}
      />
      <div className="border-t border-gray-700 my-1" />
      <PlayerSlot
        player={match.player2}
        isWinner={isComplete && match.winner?.id === match.player2.id}
        isEliminated={isComplete && match.winner?.id !== match.player2.id}
      />
    </div>
  );
}

interface PlayerSlotProps {
  player: BracketPlayer | null;
  isWinner: boolean;
  isEliminated: boolean;
}

function PlayerSlot({ player, isWinner, isEliminated }: PlayerSlotProps) {
  if (!player) {
    return <div className="py-1 px-2 text-gray-600 text-lg">TBD</div>;
  }

  const classes = [
    'py-1 px-2 text-lg font-medium rounded transition-colors',
    isWinner && 'text-emerald-400 font-bold bg-emerald-500/10',
    isEliminated && 'text-gray-500 line-through',
    !isWinner && !isEliminated && 'text-white',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {isWinner && (
        <span className="mr-1" aria-label="vencedor">
          &#9654;
        </span>
      )}
      {player.name}
    </div>
  );
}
