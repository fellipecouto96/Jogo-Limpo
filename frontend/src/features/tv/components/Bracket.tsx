import { memo, useEffect, useMemo } from 'react';
import type { BracketRound as BracketRoundType } from '../types.ts';
import { BracketRound } from './BracketRound.tsx';
import { logClientPerformance } from '../../../shared/logger.ts';

interface BracketProps {
  rounds: BracketRoundType[];
  totalRounds: number;
}

export const Bracket = memo(function Bracket({ rounds, totalRounds }: BracketProps) {
  const gridTemplateColumns = useMemo(
    () => `repeat(${totalRounds}, minmax(200px, 1fr))`,
    [totalRounds]
  );

  useEffect(() => {
    const startedAt = performance.now();
    const frame = requestAnimationFrame(() => {
      const durationMs = performance.now() - startedAt;
      logClientPerformance('bracket_perf', 'bracket_render_ms', {
        durationMs: Number(durationMs.toFixed(2)),
        rounds: rounds.length,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [rounds.length, totalRounds]);

  return (
    <div
      className="grid gap-4 items-center w-full overflow-x-auto"
      style={{ gridTemplateColumns }}
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
});
