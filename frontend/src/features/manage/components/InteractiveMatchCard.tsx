import { useState } from 'react';
import type { BracketMatch } from '../../tv/types.ts';
import { ScoreInput } from './ScoreInput.tsx';

interface InteractiveMatchCardProps {
  match: BracketMatch;
  roundLabel: string;
  tournamentStatus: string;
  isBusy: boolean;
  onSelectWinner: (winnerId: string, winnerName: string, score1?: number, score2?: number) => void;
  onUpdateScore?: (matchId: string, score1: number, score2: number) => void;
}

export function InteractiveMatchCard({
  match,
  roundLabel,
  tournamentStatus,
  isBusy,
  onSelectWinner,
  onUpdateScore,
}: InteractiveMatchCardProps) {
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<{ id: string; name: string } | null>(null);

  const isBye = match.isBye;
  const isComplete = Boolean(match.winner) || isBye;
  const hasScores = match.player1Score !== null && match.player2Score !== null;
  const canInteract =
    tournamentStatus === 'RUNNING' &&
    !isBye &&
    !match.winner &&
    Boolean(match.player2) &&
    !isBusy;
  const canEditScore =
    tournamentStatus === 'RUNNING' &&
    !isBye &&
    Boolean(match.winner) &&
    Boolean(match.player2) &&
    !isBusy &&
    Boolean(onUpdateScore);

  const player1IsWinner = Boolean(match.winner && match.winner.id === match.player1.id);
  const player2IsWinner = Boolean(match.winner && match.player2 && match.winner.id === match.player2.id);

  const rootClasses = [
    'w-full overflow-hidden rounded-2xl border bg-[#0b1120] transition-all duration-200',
    isComplete
      ? 'border-gray-700/80 opacity-85'
      : canInteract
        ? 'border-emerald-400/50 shadow-[0_16px_30px_rgba(0,0,0,0.35)]'
        : 'border-gray-700/80',
  ]
    .filter(Boolean)
    .join(' ');

  const handlePlayerClick = (playerId: string, playerName: string) => {
    if (!canInteract) return;
    setPendingWinner({ id: playerId, name: playerName });
    setShowScoreInput(true);
  };

  const handleConfirmWithScore = (score1: number, score2: number) => {
    if (pendingWinner) {
      onSelectWinner(pendingWinner.id, pendingWinner.name, score1, score2);
    }
    setShowScoreInput(false);
    setPendingWinner(null);
  };

  const handleConfirmWithoutScore = () => {
    if (pendingWinner) {
      onSelectWinner(pendingWinner.id, pendingWinner.name);
    }
    setShowScoreInput(false);
    setPendingWinner(null);
  };

  const handleEditScore = () => {
    setShowScoreInput(true);
    setPendingWinner(null);
  };

  const handleUpdateScore = (score1: number, score2: number) => {
    if (onUpdateScore) {
      onUpdateScore(match.id, score1, score2);
    }
    setShowScoreInput(false);
  };

  if (showScoreInput && match.player2) {
    const isEditMode = Boolean(match.winner) && !pendingWinner;
    
    if (isEditMode) {
      return (
        <article className={rootClasses}>
          <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
              Editar Placar
            </p>
          </header>
          <ScoreInput
            player1Name={match.player1.name}
            player2Name={match.player2.name}
            initialScore1={match.player1Score ?? 0}
            initialScore2={match.player2Score ?? 0}
            onConfirm={handleUpdateScore}
            onCancel={() => setShowScoreInput(false)}
            disabled={isBusy}
          />
        </article>
      );
    }

    return (
      <article className={rootClasses}>
        <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Confirmar: {pendingWinner?.name}
          </p>
        </header>
        
        <div className="p-4 space-y-4">
          <button
            type="button"
            onClick={handleConfirmWithoutScore}
            disabled={isBusy}
            className="w-full py-4 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg
                       active:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            Confirmar sem placar
          </button>

          <div className="text-center text-sm text-gray-400">ou adicione o placar:</div>

          <ScoreInput
            player1Name={match.player1.name}
            player2Name={match.player2.name}
            initialScore1={pendingWinner?.id === match.player1.id ? 1 : 0}
            initialScore2={pendingWinner?.id === match.player2.id ? 1 : 0}
            onConfirm={handleConfirmWithScore}
            onCancel={() => {
              setShowScoreInput(false);
              setPendingWinner(null);
            }}
            disabled={isBusy}
          />
        </div>
      </article>
    );
  }

  return (
    <article className={rootClasses}>
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
          {roundLabel}
        </p>
        <p className="text-xs text-gray-400">Partida {match.positionInBracket}</p>
      </header>

      <div className="divide-y divide-gray-800">
        <PlayerRow
          name={match.player1.name}
          score={match.player1Score}
          isWinner={player1IsWinner}
          isLoser={Boolean(match.winner && !player1IsWinner)}
          disabled={!canInteract}
          onClick={() => handlePlayerClick(match.player1.id, match.player1.name)}
        />

        {match.player2 ? (
          <PlayerRow
            name={match.player2.name}
            score={match.player2Score}
            isWinner={player2IsWinner}
            isLoser={Boolean(match.winner && !player2IsWinner)}
            disabled={!canInteract}
            onClick={() => handlePlayerClick(match.player2!.id, match.player2!.name)}
          />
        ) : (
          <div className="flex min-h-[60px] items-center px-4 text-base font-semibold text-gray-500">
            Aguardando adversario
          </div>
        )}
      </div>

      {isBye && (
        <footer className="border-t border-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Avançou automaticamente
        </footer>
      )}

      {canEditScore && (
        <footer className="border-t border-gray-800 px-3 py-2">
          <button
            type="button"
            onClick={handleEditScore}
            disabled={isBusy}
            className="w-full py-2 text-xs font-medium text-gray-400 hover:text-emerald-400 
                       transition-colors disabled:opacity-50"
          >
            {hasScores ? 'Editar placar' : 'Adicionar placar'}
          </button>
        </footer>
      )}
    </article>
  );
}

function PlayerRow({
  name,
  score,
  isWinner,
  isLoser,
  disabled,
  onClick,
}: {
  name: string;
  score: number | null;
  isWinner: boolean;
  isLoser: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const classes = [
    'flex min-h-[64px] w-full items-center px-4 text-left text-lg font-semibold transition-all [touch-action:manipulation]',
    disabled ? 'cursor-default' : 'cursor-pointer',
    isWinner && 'bg-emerald-500/20 text-emerald-200',
    isLoser && 'bg-transparent text-gray-500',
    !isWinner && !isLoser && !disabled && 'bg-[#111827] text-white active:bg-[#1f2937]',
    !isWinner && !isLoser && disabled && 'bg-[#0f172a] text-gray-200',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={`Selecionar ${name} como vencedor`}
    >
      <span className="truncate flex-1">{name}</span>
      {score !== null && (
        <span className={`ml-2 text-2xl font-bold tabular-nums ${isWinner ? 'text-emerald-400' : 'text-gray-500'}`}>
          {score}
        </span>
      )}
      {isWinner && score === null && (
        <span className="ml-auto text-sm font-bold uppercase tracking-[0.14em]">Vencedor</span>
      )}
    </button>
  );
}
