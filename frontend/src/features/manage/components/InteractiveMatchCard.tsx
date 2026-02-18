import type { BracketMatch } from '../../tv/types.ts';

interface InteractiveMatchCardProps {
  match: BracketMatch;
  roundLabel: string;
  tournamentStatus: string;
  isBusy: boolean;
  onSelectWinner: (winnerId: string, winnerName: string) => void;
}

export function InteractiveMatchCard({
  match,
  roundLabel,
  tournamentStatus,
  isBusy,
  onSelectWinner,
}: InteractiveMatchCardProps) {
  const isBye = match.isBye;
  const isComplete = Boolean(match.winner) || isBye;
  const canInteract =
    tournamentStatus === 'RUNNING' &&
    !isBye &&
    !match.winner &&
    Boolean(match.player2) &&
    !isBusy;

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
          isWinner={player1IsWinner}
          isLoser={Boolean(match.winner && !player1IsWinner)}
          disabled={!canInteract}
          onClick={() => onSelectWinner(match.player1.id, match.player1.name)}
        />

        {match.player2 ? (
          <PlayerRow
            name={match.player2.name}
            isWinner={player2IsWinner}
            isLoser={Boolean(match.winner && !player2IsWinner)}
            disabled={!canInteract}
            onClick={() => onSelectWinner(match.player2!.id, match.player2!.name)}
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
    </article>
  );
}

function PlayerRow({
  name,
  isWinner,
  isLoser,
  disabled,
  onClick,
}: {
  name: string;
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
      <span className="truncate">{name}</span>
      {isWinner && <span className="ml-auto text-sm font-bold uppercase tracking-[0.14em]">Vencedor</span>}
    </button>
  );
}
