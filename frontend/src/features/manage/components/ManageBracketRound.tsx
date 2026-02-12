import type { BracketRound } from '../../tv/types.ts';
import { InteractiveMatchCard } from './InteractiveMatchCard.tsx';

interface ManageBracketRoundProps {
  round: BracketRound;
  totalRounds: number;
  isLastRound: boolean;
  tournamentId: string;
  tournamentStatus: string;
  onResultRecorded: () => void;
}

export function ManageBracketRound({
  round,
  totalRounds,
  isLastRound,
  tournamentId,
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
      {matchSlots.map((match, index) => (
        <div
          key={match?.id ?? `empty-${round.roundNumber}-${index}`}
          className="relative"
        >
          <InteractiveMatchCard
            match={match}
            tournamentStatus={tournamentStatus}
            tournamentId={tournamentId}
            onResultRecorded={onResultRecorded}
          />
          {!isLastRound && (
            <div
              className="absolute top-1/2 -right-3 w-3 border-t-2 border-gray-600"
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}
