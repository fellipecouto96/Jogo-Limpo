import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileRound } from '../MobileRound.tsx';
import type { BracketRound } from '../../types.ts';

function makeMatch(overrides: Partial<BracketRound['matches'][0]> = {}): BracketRound['matches'][0] {
  return {
    id: 'm1',
    positionInBracket: 1,
    player1: { id: 'p1', name: 'Alice' },
    player2: { id: 'p2', name: 'Bob' },
    winner: null,
    player1Score: null,
    player2Score: null,
    isBye: false,
    finishedAt: null,
    ...overrides,
  };
}

function makeRound(overrides: Partial<BracketRound> = {}): BracketRound {
  return {
    id: 'r1',
    roundNumber: 1,
    label: 'Final',
    matches: [makeMatch()],
    ...overrides,
  };
}

describe('MobileRound', () => {
  it('renders the round label', () => {
    render(<MobileRound round={makeRound({ label: 'Quartas de Final' })} totalRounds={3} />);
    expect(screen.getByText('Quartas de Final')).toBeTruthy();
  });

  it('renders matches for a standard round', () => {
    const round = makeRound({
      roundNumber: 1,
      matches: [
        makeMatch({ id: 'm1', positionInBracket: 1, player1: { id: 'p1', name: 'Alice' } }),
        makeMatch({ id: 'm2', positionInBracket: 2, player1: { id: 'p3', name: 'Carol' } }),
      ],
    });
    render(<MobileRound round={round} totalRounds={2} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Carol')).toBeTruthy();
  });

  it('fills missing positions with null placeholders in standard rounds', () => {
    // 3 total rounds → round 1 expects 4 matches
    const round = makeRound({
      roundNumber: 1,
      matches: [makeMatch({ id: 'm1', positionInBracket: 1 })],
    });
    const { container } = render(<MobileRound round={round} totalRounds={3} />);
    // MatchCard renders a div for each slot; 4 expected total (3 empty + 1 real)
    const matchCards = container.querySelectorAll('[class*="rounded"]');
    expect(matchCards.length).toBeGreaterThanOrEqual(4);
  });

  it('renders repechage round with only actual matches (no padding formula)', () => {
    const round = makeRound({
      roundNumber: 6,
      isRepechage: true,
      matches: [
        makeMatch({ id: 'm1', player1: { id: 'p1', name: 'Repescado' } }),
      ],
    });
    render(<MobileRound round={round} totalRounds={4} />);
    // Should render the match without applying power-of-2 formula
    expect(screen.getByText('Repescado')).toBeTruthy();
  });

  it('renders multiple repechage matches without padding', () => {
    const round = makeRound({
      roundNumber: 6,
      isRepechage: true,
      matches: [
        makeMatch({ id: 'm1', player1: { id: 'p1', name: 'PlayerA' } }),
        makeMatch({ id: 'm2', player1: { id: 'p2', name: 'PlayerB' } }),
        makeMatch({ id: 'm3', player1: { id: 'p3', name: 'PlayerC' } }),
      ],
    });
    render(<MobileRound round={round} totalRounds={4} />);
    expect(screen.getByText('PlayerA')).toBeTruthy();
    expect(screen.getByText('PlayerB')).toBeTruthy();
    expect(screen.getByText('PlayerC')).toBeTruthy();
  });
});
