import type { BracketMatch, BracketPlayer, BracketRound } from '../tv/types.ts';

interface ThirdAndFourth {
  thirdPlace: BracketPlayer | null;
  fourthPlace: BracketPlayer | null;
}

export interface PodiumScoreRow {
  label: string;
  matchup: string;
  score: string;
  finishedAt: string | null;
}

function deriveMatchLoser(match: BracketMatch): BracketPlayer | null {
  if (!match.winner || !match.player2) return null;
  if (match.winner.id === match.player1.id) return match.player2;
  if (match.winner.id === match.player2.id) return match.player1;
  return null;
}

function hasRecordedScore(match: BracketMatch): boolean {
  return match.player1Score !== null && match.player2Score !== null;
}

function scoreForMatch(match: BracketMatch): string {
  return `${match.player1Score} × ${match.player2Score}`;
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

export function derivePodiumScoreRows(
  rounds: BracketRound[],
  totalRounds: number
): PodiumScoreRow[] {
  const rows: PodiumScoreRow[] = [];

  if (totalRounds > 0) {
    const finalRound = rounds[totalRounds - 1];
    const finalMatch = finalRound?.matches.length === 1 ? finalRound.matches[0] : null;
    if (finalMatch && hasRecordedScore(finalMatch)) {
      rows.push({
        label: 'Final',
        matchup: `${finalMatch.player1.name} vs ${finalMatch.player2?.name ?? 'TBD'}`,
        score: scoreForMatch(finalMatch),
        finishedAt: finalMatch.finishedAt,
      });
    }
  }

  if (totalRounds > 1) {
    const semifinalRound = rounds[totalRounds - 2];
    const semifinalRows = [...(semifinalRound?.matches ?? [])]
      .sort((a, b) => a.positionInBracket - b.positionInBracket)
      .filter(hasRecordedScore)
      .map((match, index) => ({
        label: `Semifinal ${index + 1}`,
        matchup: `${match.player1.name} vs ${match.player2?.name ?? 'TBD'}`,
        score: scoreForMatch(match),
        finishedAt: match.finishedAt,
      }));
    rows.push(...semifinalRows);
  }

  return rows;
}
