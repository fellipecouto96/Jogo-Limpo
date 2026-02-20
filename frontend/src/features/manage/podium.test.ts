import { describe, expect, it } from 'vitest';
import type { BracketRound } from '../tv/types.ts';
import {
  deriveRunnerUp,
  deriveThirdAndFourth,
  derivePodiumScoreRows,
} from './podium.ts';

function buildRounds(): BracketRound[] {
  return [
    {
      id: 'r-1',
      roundNumber: 1,
      label: 'Quartas',
      matches: [],
    },
    {
      id: 'r-2',
      roundNumber: 2,
      label: 'Semifinal',
      matches: [
        {
          id: 'm-sf-1',
          positionInBracket: 1,
          player1: { id: 'p-1', name: 'Alice' },
          player2: { id: 'p-2', name: 'Bruno' },
          winner: { id: 'p-1', name: 'Alice' },
          player1Score: 2,
          player2Score: 0,
          isBye: false,
          finishedAt: '2026-02-20T10:00:00.000Z',
        },
        {
          id: 'm-sf-2',
          positionInBracket: 2,
          player1: { id: 'p-3', name: 'Caio' },
          player2: { id: 'p-4', name: 'Duda' },
          winner: { id: 'p-4', name: 'Duda' },
          player1Score: 1,
          player2Score: 2,
          isBye: false,
          finishedAt: '2026-02-20T10:20:00.000Z',
        },
      ],
    },
    {
      id: 'r-3',
      roundNumber: 3,
      label: 'Final',
      matches: [
        {
          id: 'm-final',
          positionInBracket: 1,
          player1: { id: 'p-1', name: 'Alice' },
          player2: { id: 'p-4', name: 'Duda' },
          winner: { id: 'p-4', name: 'Duda' },
          player1Score: 0,
          player2Score: 2,
          isBye: false,
          finishedAt: '2026-02-20T11:00:00.000Z',
        },
        {
          id: 'm-third',
          positionInBracket: 2,
          player1: { id: 'p-2', name: 'Bruno' },
          player2: { id: 'p-3', name: 'Caio' },
          winner: { id: 'p-2', name: 'Bruno' },
          player1Score: 2,
          player2Score: 1,
          isBye: false,
          finishedAt: '2026-02-20T11:05:00.000Z',
        },
      ],
    },
  ];
}

describe('podium helpers', () => {
  it('derives runner-up from final loser', () => {
    const runnerUp = deriveRunnerUp(buildRounds(), 3);
    expect(runnerUp?.id).toBe('p-1');
    expect(runnerUp?.name).toBe('Alice');
  });

  it('derives third and fourth from semifinal losers', () => {
    const result = deriveThirdAndFourth(buildRounds(), 3);
    expect(result.thirdPlace?.id).toBe('p-2');
    expect(result.thirdPlace?.name).toBe('Bruno');
    expect(result.fourthPlace?.id).toBe('p-3');
    expect(result.fourthPlace?.name).toBe('Caio');
  });

  it('returns null positions when tournament has no semifinal round', () => {
    const rounds: BracketRound[] = [
      {
        id: 'r-final',
        roundNumber: 1,
        label: 'Final',
        matches: [
          {
            id: 'm-final',
            positionInBracket: 1,
            player1: { id: 'p-1', name: 'Alice' },
            player2: { id: 'p-2', name: 'Bruno' },
            winner: { id: 'p-1', name: 'Alice' },
            player1Score: 2,
            player2Score: 0,
            isBye: false,
            finishedAt: '2026-02-20T11:00:00.000Z',
          },
        ],
      },
    ];

    const result = deriveThirdAndFourth(rounds, 1);
    expect(result.thirdPlace).toBeNull();
    expect(result.fourthPlace).toBeNull();
  });

  it('returns only recorded scores for final and semifinals', () => {
    const rows = derivePodiumScoreRows(buildRounds(), 3);
    expect(rows.map((row) => row.label)).toEqual([
      'Final',
      'Disputa de 3º',
    ]);
    expect(rows[0]?.score).toBe('0 × 2');
    expect(rows[1]?.score).toBe('2 × 1');
  });

  it('returns empty array when no scores are registered', () => {
    const rounds: BracketRound[] = [
      {
        id: 'r-final',
        roundNumber: 1,
        label: 'Final',
        matches: [
          {
            id: 'm-final',
            positionInBracket: 1,
            player1: { id: 'p-1', name: 'Alice' },
            player2: { id: 'p-2', name: 'Bruno' },
            winner: { id: 'p-1', name: 'Alice' },
            player1Score: null,
            player2Score: null,
            isBye: false,
            finishedAt: '2026-02-20T11:00:00.000Z',
          },
        ],
      },
    ];

    const rows = derivePodiumScoreRows(rounds, 1);
    expect(rows).toEqual([]);
  });
});
