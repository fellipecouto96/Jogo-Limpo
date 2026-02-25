import { memo, useMemo } from 'react';
import type { BracketRound } from '../types.ts';
import { MatchCard } from './MatchCard.tsx';

interface MobileRoundProps {
  round: BracketRound;
  totalRounds: number;
}

export const MobileRound = memo(function MobileRound({
  round,
  totalRounds,
}: MobileRoundProps) {
  const matchSlots = useMemo(() => {
    // Repechage rounds have a dynamic number of sub-round matches — don't apply
    // the power-of-2 formula; just render whatever matches exist.
    if (round.isRepechage) {
      return round.matches.map((m) => m);
    }
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
  }, [round.isRepechage, round.matches, round.roundNumber, totalRounds]);

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {round.label}
      </h3>
      <div className="flex flex-col gap-2">
        {matchSlots.map((match, index) => (
          <MatchCard
            key={match?.id ?? `empty-${round.roundNumber}-${index}`}
            match={match}
          />
        ))}
      </div>
    </section>
  );
});
