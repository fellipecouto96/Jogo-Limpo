import type { BracketRound as BracketRoundType } from '../types.ts';
import { BracketRound } from './BracketRound.tsx';

interface BracketProps {
  rounds: BracketRoundType[];
  totalRounds: number;
}

export function Bracket({ rounds, totalRounds }: BracketProps) {
  return (
    <div
      className="grid gap-4 items-center w-full overflow-x-auto"
      style={{
        gridTemplateColumns: `repeat(${totalRounds}, minmax(200px, 1fr))`,
      }}
    >
      {rounds.map((round) => (
        <BracketRound
          key={round.id}
          round={round}
          totalRounds={totalRounds}
          isLastRound={round.roundNumber === totalRounds}
        />
      ))}
    </div>
  );
}
