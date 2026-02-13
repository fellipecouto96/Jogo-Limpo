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
  const [confirming, setConfirming] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { recordResult, isSubmitting } = useRecordResult();

  const toggleSelection = (playerId: string) => {
    setSelectedId((current) => {
      const next = current === playerId ? null : playerId;
      if (next !== current) {
        setConfirming(false);
      }
      return next;
    });
  };

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
  const isInteractive = !isComplete && tournamentStatus === 'RUNNING';
  const selectedPlayer =
    selectedId && selectedId === match.player1.id
      ? match.player1
      : selectedId && match.player2 && selectedId === match.player2.id
        ? match.player2
        : null;

  const handleConfirm = async () => {
    if (!selectedId) return;
    setInlineError(null);
    try {
      await recordResult(tournamentId, match.id, selectedId);
      setSelectedId(null);
      setConfirming(false);
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
        'relative rounded-2xl p-4 min-w-48 border transition-all duration-500 ease-out',
        isInteractive
          ? 'bg-[#0C0A09]/80 border-amber-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.55)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.65)]'
          : 'bg-[#0C0A09]/60 border-emerald-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.45)]',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" aria-hidden />
      <SelectableSlot
        player={match.player1}
        isSelected={selectedId === match.player1.id}
        isDimmed={selectedId !== null && selectedId !== match.player1.id}
        disabled={!isInteractive || isSubmitting}
        onClick={() => toggleSelection(match.player1.id)}
      />
      <div className="border-t border-gray-700 my-1" />
      {match.player2 ? (
        <SelectableSlot
          player={match.player2}
          isSelected={selectedId === match.player2.id}
          isDimmed={selectedId !== null && selectedId !== match.player2.id}
          disabled={!isInteractive || isSubmitting}
          onClick={() => toggleSelection(match.player2!.id)}
        />
      ) : (
        <div className="py-1 px-2 text-gray-600 text-lg">TBD</div>
      )}

      {selectedPlayer && isInteractive && (
        <div className="mt-3 space-y-2">
          <button
            onClick={() => setConfirming(true)}
            disabled={isSubmitting}
            className="w-full text-sm font-semibold py-2 rounded-lg bg-[#CA8A04] text-[#0C0A09] hover:bg-[#f2b019] disabled:bg-gray-700 disabled:text-gray-500 transition-all duration-300"
          >
            {isSubmitting ? 'Salvando...' : `Selecionar ${selectedPlayer.name}`}
          </button>
          <div
            className={[
              'overflow-hidden rounded-xl border border-amber-500/30 bg-[#1C1917]/80 transition-all duration-500',
              confirming ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0',
            ].join(' ')}
          >
            <div className="p-3 text-sm text-amber-100 flex flex-col gap-3">
              <p className="font-semibold">
                Confirmar {selectedPlayer.name} como vencedor?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-emerald-500/90 text-[#0C0A09] font-semibold py-2 hover:bg-emerald-400 transition-colors disabled:bg-gray-600"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-white/20 text-white font-semibold py-2 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {inlineError && (
        <p className="mt-2 text-xs text-red-400 animate-pulse">{inlineError}</p>
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
    'py-1.5 px-3 text-lg font-semibold rounded-xl transition-colors bg-white/5',
    isWinner && 'text-emerald-300 font-bold bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
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
    'w-full text-left py-2.5 px-3 text-lg font-semibold rounded-xl transition-all duration-300 border border-transparent',
    isSelected &&
      'border-emerald-400/70 bg-emerald-500/10 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    isDimmed && 'text-gray-600',
    !isSelected && !isDimmed && 'text-white hover:bg-white/5',
    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-pressed={isSelected}
    >
      {player.name}
    </button>
  );
}
