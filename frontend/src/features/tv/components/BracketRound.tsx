import { memo, useMemo } from 'react';
import type { BracketRound as BracketRoundData } from '../types.ts';
import { MatchCard } from './MatchCard.tsx';

interface BracketRoundProps {
  round: BracketRoundData;
  totalRounds: number;
  isLastRound: boolean;
}

export const BracketRound = memo(function BracketRound({
  round,
  totalRounds,
  isLastRound,
}: BracketRoundProps) {
  const matchSlots = useMemo(() => {
    const firstRoundMatchCount = Math.pow(2, totalRounds - 1);
    const expectedMatchCount =
      firstRoundMatchCount / Math.pow(2, round.roundNumber - 1);

    const matchByPosition = new Map(
      round.matches.map((match) => [match.positionInBracket, match])
    );

    return Array.from({ length: expectedMatchCount }, (_, i) => {
      const position = i + 1;
      return matchByPosition.get(position) ?? null;
    });
  }, [round.matches, round.roundNumber, totalRounds]);

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
          <MatchCard match={match} />
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
});
