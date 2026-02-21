import { useState } from 'react';
import type { BracketMatch } from '../../tv/types.ts';
import { ScoreInput } from './ScoreInput.tsx';
import { Spinner } from '../../../shared/loading/LoadingSystem.tsx';

interface InteractiveMatchCardProps {
  match: BracketMatch;
  roundLabel: string;
  tournamentStatus: string;
  isBusy: boolean;
  isPending?: boolean;
  recentWinnerId?: string | null;
  animateConnector?: boolean;
  allowRebuy?: boolean;
  onSelectWinner: (winnerId: string, winnerName: string, score1?: number, score2?: number) => void;
  onUpdateScore?: (matchId: string, score1: number, score2: number) => void;
  onRebuy?: (playerId: string) => void;
}

export function InteractiveMatchCard({
  match,
  roundLabel,
  tournamentStatus,
  isBusy,
  isPending = false,
  recentWinnerId = null,
  animateConnector = false,
  allowRebuy = false,
  onSelectWinner,
  onUpdateScore,
  onRebuy,
}: InteractiveMatchCardProps) {
  const [showScoreInput, setShowScoreInput] = useState(false);

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
    isPending
      ? 'border-emerald-400/60 jl-pending-ring'
      : isComplete
        ? 'border-gray-700/80 opacity-85'
        : canInteract
          ? 'border-emerald-400/50 shadow-[0_16px_30px_rgba(0,0,0,0.35)]'
          : 'border-gray-700/80',
  ]
    .filter(Boolean)
    .join(' ');

  const handlePlayerClick = (playerId: string, playerName: string) => {
    if (!canInteract) return;
    onSelectWinner(playerId, playerName);
  };

  const handleEditScore = () => {
    setShowScoreInput(true);
  };

  const handleUpdateScore = (score1: number, score2: number) => {
    if (onUpdateScore) {
      onUpdateScore(match.id, score1, score2);
    }
    setShowScoreInput(false);
  };

  if (showScoreInput && match.player2 && match.winner) {
    return (
      <article className={rootClasses}>
        <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
            {hasScores ? 'Editar placar' : 'Adicionar placar'}
          </p>
        </header>
        <ScoreInput
          player1Name={match.player1.name}
          player2Name={match.player2.name}
          initialScore1={match.player1Score ?? (match.winner.id === match.player1.id ? 1 : 0)}
          initialScore2={match.player2Score ?? (match.winner.id === match.player2.id ? 1 : 0)}
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
          {roundLabel}
        </p>
        {isPending ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <Spinner className="h-3.5 w-3.5" />
            Registrando
          </span>
        ) : (
          <p className="text-xs text-gray-400">Partida {match.positionInBracket}</p>
        )}
      </header>

      <div className="divide-y divide-gray-800">
        <PlayerRow
          playerId={match.player1.id}
          name={match.player1.name}
          score={match.player1Score}
          isWinner={player1IsWinner}
          isLoser={Boolean(match.winner && !player1IsWinner)}
          isRecentlyAdvanced={recentWinnerId === match.player1.id}
          isRebuy={match.player1.isRebuy}
          disabled={!canInteract}
          onClick={() => handlePlayerClick(match.player1.id, match.player1.name)}
          showRebuyButton={Boolean(match.winner && !player1IsWinner && allowRebuy && !isBusy && onRebuy)}
          onRebuy={onRebuy ? () => onRebuy(match.player1.id) : undefined}
        />

        {match.player2 ? (
          <PlayerRow
            playerId={match.player2.id}
            name={match.player2.name}
            score={match.player2Score}
            isWinner={player2IsWinner}
            isLoser={Boolean(match.winner && !player2IsWinner)}
            isRecentlyAdvanced={recentWinnerId === match.player2.id}
            isRebuy={match.player2.isRebuy}
            disabled={!canInteract}
            onClick={() => handlePlayerClick(match.player2!.id, match.player2!.name)}
            showRebuyButton={Boolean(match.winner && !player2IsWinner && allowRebuy && !isBusy && onRebuy)}
            onRebuy={onRebuy ? () => onRebuy(match.player2!.id) : undefined}
          />
        ) : (
          <div className="flex min-h-[60px] items-center px-4 text-base font-semibold text-gray-500">
            Aguardando adversário
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
            className="w-full py-2.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 
                       transition-colors disabled:opacity-50 [touch-action:manipulation]"
          >
            {hasScores ? 'Editar placar' : 'Adicionar placar'}
          </button>
        </footer>
      )}

      {animateConnector && (
        <div className="px-4 pb-2">
          <div className="jl-connector-flow h-[2px] w-full rounded-full bg-emerald-400/70" />
        </div>
      )}
    </article>
  );
}

function PlayerRow({
  playerId,
  name,
  score,
  isWinner,
  isLoser,
  isRecentlyAdvanced,
  isRebuy,
  disabled,
  onClick,
  showRebuyButton,
  onRebuy,
}: {
  playerId: string;
  name: string;
  score: number | null;
  isWinner: boolean;
  isLoser: boolean;
  isRecentlyAdvanced: boolean;
  isRebuy?: boolean;
  disabled: boolean;
  onClick: () => void;
  showRebuyButton?: boolean;
  onRebuy?: () => void;
}) {
  const classes = [
    'flex min-h-[64px] w-full items-center px-4 text-left text-lg font-semibold transition-all [touch-action:manipulation]',
    disabled ? 'cursor-default' : 'cursor-pointer',
    isWinner && 'bg-emerald-500/20 text-emerald-200',
    isLoser && 'bg-transparent text-gray-500',
    !isWinner && !isLoser && !disabled && 'bg-[#111827] text-white active:bg-[#1f2937]',
    !isWinner && !isLoser && disabled && 'bg-[#0f172a] text-gray-200',
    isWinner && isRecentlyAdvanced && 'jl-winner-pulse',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative">
      <button
        type="button"
        className={classes}
        disabled={disabled}
        onClick={onClick}
        aria-label={`Selecionar ${name} como vencedor`}
        data-player-id={playerId}
      >
        <span className="truncate flex-1">
          {name}
          {isRebuy && (
            <span className="ml-1.5 text-xs text-gray-500" title="Repescagem">🔁</span>
          )}
        </span>
        {score !== null && (
          <span className={`ml-2 text-2xl font-bold tabular-nums ${isWinner ? 'text-emerald-400' : 'text-gray-500'}`}>
            {score}
          </span>
        )}
        {isWinner && score === null && (
          <span className="ml-auto text-sm font-bold uppercase tracking-[0.14em]">Vencedor</span>
        )}
      </button>
      {showRebuyButton && onRebuy && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRebuy(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 transition-colors [touch-action:manipulation]"
          title="Repescagem"
        >
          🔁 Repescagem
        </button>
      )}
    </div>
  );
}
