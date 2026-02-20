import type { BracketMatch, BracketPlayer, BracketRound } from '../tv/types.ts';

interface ThirdAndFourth {
  thirdPlace: BracketPlayer | null;
  fourthPlace: BracketPlayer | null;
}

function deriveMatchLoser(match: BracketMatch): BracketPlayer | null {
  if (!match.winner || !match.player2) return null;
  if (match.winner.id === match.player1.id) return match.player2;
  if (match.winner.id === match.player2.id) return match.player1;
  return null;
}

export function deriveRunnerUp(
  rounds: BracketRound[],
  totalRounds: number
): BracketPlayer | null {
  if (totalRounds === 0) return null;
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound || finalRound.matches.length !== 1) return null;
  return deriveMatchLoser(finalRound.matches[0]);
}

export function deriveThirdAndFourth(
  rounds: BracketRound[],
  totalRounds: number
): ThirdAndFourth {
  if (totalRounds < 2) {
    return { thirdPlace: null, fourthPlace: null };
  }

  const semifinalRound = rounds[totalRounds - 2];
  if (!semifinalRound) {
    return { thirdPlace: null, fourthPlace: null };
  }

  const semifinalLosers = [...semifinalRound.matches]
    .sort((a, b) => a.positionInBracket - b.positionInBracket)
    .map(deriveMatchLoser)
    .filter((player): player is BracketPlayer => player !== null);

  return {
    thirdPlace: semifinalLosers[0] ?? null,
    fourthPlace: semifinalLosers[1] ?? null,
  };
}
