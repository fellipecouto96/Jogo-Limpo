import type { BracketRound } from '../types.ts';
import { MatchCard } from './MatchCard.tsx';

interface MobileRoundProps {
  round: BracketRound;
  totalRounds: number;
}

export function MobileRound({ round, totalRounds }: MobileRoundProps) {
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
    <section>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {round.label}
      </h3>
      <div className="flex flex-col gap-3">
        {matchSlots.map((match, index) => (
          <MatchCard
            key={match?.id ?? `empty-${round.roundNumber}-${index}`}
            match={match}
          />
        ))}
      </div>
    </section>
  );
}
