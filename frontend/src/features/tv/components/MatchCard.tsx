import type { BracketMatch, BracketPlayer } from '../types.ts';

interface MatchCardProps {
  match: BracketMatch | null;
}

export function MatchCard({ match }: MatchCardProps) {
  if (!match) {
    return (
      <div className="bg-[#0C0A09]/70 border border-white/5 rounded-2xl p-4 min-w-48">
        <PlayerSlot player={null} isWinner={false} isEliminated={false} />
        <div className="border-t border-gray-700 my-1" />
        <PlayerSlot player={null} isWinner={false} isEliminated={false} />
      </div>
    );
  }

  if (match.isBye) {
    return (
      <div className="rounded-2xl p-4 min-w-48 border border-amber-500/30 bg-[#0C0A09]/70 shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
        <PlayerSlot player={match.player1} isWinner={true} isEliminated={false} />
        <div className="border-t border-gray-700 my-1" />
        <div className="py-1 px-2 text-gray-600 text-sm italic">Avançou automaticamente</div>
      </div>
    );
  }

  const isComplete = match.winner !== null;

  return (
    <div
      className={[
        'rounded-2xl p-4 min-w-48 border transition-all duration-500',
        isComplete
          ? 'bg-[#0C0A09]/60 border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.45)]'
          : 'bg-[#0C0A09]/80 border-emerald-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.55)]',
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
        isWinner={isComplete && match.winner?.id === match.player2?.id}
        isEliminated={isComplete && match.winner?.id !== match.player2?.id}
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
    'py-1.5 px-3 text-lg font-semibold rounded-xl transition-all duration-300 bg-white/5',
    isWinner &&
      'text-emerald-300 font-bold bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    isEliminated && 'text-gray-500 line-through bg-transparent',
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
