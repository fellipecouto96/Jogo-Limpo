import { useState } from 'react';
import type { BracketMatch, BracketPlayer } from '../../tv/types.ts';
import { useRecordResult } from '../useRecordResult.ts';

interface InteractiveMatchCardProps {
  match: BracketMatch | null;
  tournamentStatus: string;
  tournamentId: string;
  onResultRecorded: () => void;
}

export function InteractiveMatchCard({
  match,
  tournamentStatus,
  tournamentId,
  onResultRecorded,
}: InteractiveMatchCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { recordResult, isSubmitting } = useRecordResult();

  // TBD slot
  if (!match) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 min-w-48">
        <div className="py-1 px-2 text-gray-600 text-lg">TBD</div>
        <div className="border-t border-gray-700 my-1" />
        <div className="py-1 px-2 text-gray-600 text-lg">TBD</div>
      </div>
    );
  }

  // Bye match — read-only, auto-advanced
  if (match.isBye) {
    return (
      <div className="rounded-lg p-3 min-w-48 border bg-gray-800/50 border-gray-700">
        <ReadOnlySlot player={match.player1} isWinner={true} isEliminated={false} />
        <div className="border-t border-gray-700 my-1" />
        <div className="py-1 px-2 text-gray-600 text-sm italic">BYE</div>
      </div>
    );
  }

  const isComplete = match.winner !== null;
  const isInteractive =
    !isComplete && tournamentStatus === 'RUNNING';

  const handleConfirm = async () => {
    if (!selectedId) return;
    setInlineError(null);
    try {
      await recordResult(tournamentId, match.id, selectedId);
      setSelectedId(null);
      onResultRecorded();
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : 'Erro ao salvar'
      );
      setTimeout(() => setInlineError(null), 3000);
    }
  };

  // Completed match — read-only display
  if (isComplete) {
    return (
      <div className="rounded-lg p-3 min-w-48 border transition-colors bg-gray-800 border-gray-600">
        <ReadOnlySlot
          player={match.player1}
          isWinner={match.winner?.id === match.player1.id}
          isEliminated={match.winner?.id !== match.player1.id}
        />
        <div className="border-t border-gray-700 my-1" />
        <ReadOnlySlot
          player={match.player2}
          isWinner={match.winner?.id === match.player2?.id}
          isEliminated={match.winner?.id !== match.player2?.id}
        />
      </div>
    );
  }

  // Interactive match — awaiting result
  return (
    <div
      className={[
        'rounded-lg p-3 min-w-48 border transition-colors',
        isInteractive
          ? 'bg-gray-800 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
          : 'bg-gray-800 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      ].join(' ')}
    >
      <SelectableSlot
        player={match.player1}
        isSelected={selectedId === match.player1.id}
        isDimmed={selectedId !== null && selectedId !== match.player1.id}
        disabled={!isInteractive || isSubmitting}
        onClick={() =>
          setSelectedId(
            selectedId === match.player1.id ? null : match.player1.id
          )
        }
      />
      <div className="border-t border-gray-700 my-1" />
      {match.player2 ? (
        <SelectableSlot
          player={match.player2}
          isSelected={selectedId === match.player2.id}
          isDimmed={selectedId !== null && selectedId !== match.player2.id}
          disabled={!isInteractive || isSubmitting}
          onClick={() =>
            setSelectedId(
              selectedId === match.player2!.id ? null : match.player2!.id
            )
          }
        />
      ) : (
        <div className="py-1 px-2 text-gray-600 text-lg">TBD</div>
      )}

      {selectedId && isInteractive && (
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="mt-2 w-full text-sm font-semibold py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
        >
          {isSubmitting ? 'Salvando...' : 'Confirmar'}
        </button>
      )}

      {inlineError && (
        <p className="mt-1 text-xs text-red-400">{inlineError}</p>
      )}
    </div>
  );
}

function ReadOnlySlot({
  player,
  isWinner,
  isEliminated,
}: {
  player: BracketPlayer | null;
  isWinner: boolean;
  isEliminated: boolean;
}) {
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

function SelectableSlot({
  player,
  isSelected,
  isDimmed,
  disabled,
  onClick,
}: {
  player: BracketPlayer;
  isSelected: boolean;
  isDimmed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const classes = [
    'w-full text-left py-1 px-2 text-lg font-medium rounded transition-colors',
    isSelected && 'ring-2 ring-emerald-500 bg-emerald-500/20 text-emerald-400',
    isDimmed && 'text-gray-500',
    !isSelected && !isDimmed && 'text-white hover:bg-white/5',
    disabled && 'cursor-not-allowed opacity-60',
    !disabled && 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {player.name}
    </button>
  );
}
