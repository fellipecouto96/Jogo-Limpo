import type { BracketRound } from '../../tv/types.ts';
import { InteractiveMatchCard } from './InteractiveMatchCard.tsx';

interface ManageBracketRoundProps {
  round: BracketRound;
  totalRounds: number;
  isLastRound: boolean;
  tournamentStatus: string;
  onResultRecorded: () => void;
}

export function ManageBracketRound({
  round,
  totalRounds,
  isLastRound,
  tournamentStatus,
  onResultRecorded,
}: ManageBracketRoundProps) {
  const firstRoundMatchCount = Math.pow(2, totalRounds - 1);
  const expectedMatchCount =
    firstRoundMatchCount / Math.pow(2, round.roundNumber - 1);

  const matchSlots = Array.from({ length: expectedMatchCount }, (_, i) => {
    const position = i + 1;
    return (
      round.matches.find((m) => m.positionInBracket === position) ?? null
    );
  });

  return (
    <div className="flex flex-col justify-around h-full gap-2 px-2">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
        {round.label}
      </h3>
      {matchSlots.map((match, index) => {
        const isThirdPlaceMatch = isLastRound && (match?.positionInBracket === 2);
        const matchLabel = isThirdPlaceMatch ? 'Disputa de 3º Lugar' : round.label;
        return (
        <div
          key={match?.id ?? `empty-${round.roundNumber}-${index}`}
          className="relative"
        >
          {match ? (
            <InteractiveMatchCard
              match={match}
              roundLabel={matchLabel}
              tournamentStatus={tournamentStatus}
              isBusy={false}
              onSelectWinner={async () => {
                await onResultRecorded();
              }}
            />
          ) : (
            <div className="w-full min-h-[128px] rounded-2xl border border-gray-800 bg-[#0b1120] px-4 py-6 text-sm text-gray-500">
              Aguardando partida
            </div>
          )}
          {!isLastRound && (
            <div
              className="absolute top-1/2 -right-3 w-3 border-t-2 border-gray-600"
              aria-hidden="true"
            />
          )}
        </div>
        );
      })}
    </div>
  );
}
