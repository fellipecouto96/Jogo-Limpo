import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BracketRound } from '../BracketRound.tsx';
import type { BracketRound as BracketRoundData } from '../../types.ts';

function makeMatch(overrides: Partial<BracketRoundData['matches'][0]> = {}): BracketRoundData['matches'][0] {
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

function makeRound(overrides: Partial<BracketRoundData> = {}): BracketRoundData {
  return {
    id: 'r1',
    roundNumber: 1,
    label: 'Final',
    matches: [makeMatch()],
    ...overrides,
  };
}

describe('BracketRound', () => {
  it('renders the round label', () => {
    render(
      <BracketRound
        round={makeRound({ label: 'Semifinal' })}
        totalRounds={2}
        isLastRound={false}
      />
    );
    expect(screen.getByText('Semifinal')).toBeTruthy();
  });

  it('renders matches for a standard round', () => {
    const round = makeRound({
      roundNumber: 1,
      matches: [
        makeMatch({ id: 'm1', positionInBracket: 1, player1: { id: 'p1', name: 'Alice' } }),
        makeMatch({ id: 'm2', positionInBracket: 2, player1: { id: 'p3', name: 'Carol' } }),
      ],
    });
    render(
      <BracketRound round={round} totalRounds={2} isLastRound={false} />
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Carol')).toBeTruthy();
  });

  it('fills missing positions with null match placeholders in standard rounds', () => {
    // Round 1 of a 3-round bracket should have 4 slots; provide only 2 matches
    const round = makeRound({
      roundNumber: 1,
      matches: [
        makeMatch({ id: 'm1', positionInBracket: 1 }),
        makeMatch({ id: 'm3', positionInBracket: 3 }),
      ],
    });
    const { container } = render(
      <BracketRound round={round} totalRounds={3} isLastRound={false} />
    );
    // 4 slot divs: 2 real matches + 2 empty placeholders
    const slots = container.querySelectorAll('.relative');
    expect(slots.length).toBe(4);
  });

  it('renders repechage round with only the actual matches (no padding)', () => {
    const round = makeRound({
      roundNumber: 5,
      isRepechage: true,
      matches: [
        makeMatch({ id: 'm1', positionInBracket: 1, player1: { id: 'p1', name: 'Repescado' } }),
      ],
    });
    const { container } = render(
      <BracketRound round={round} totalRounds={4} isLastRound={false} />
    );
    // Only 1 slot — no formula applied
    const slots = container.querySelectorAll('.relative');
    expect(slots.length).toBe(1);
    expect(screen.getByText('Repescado')).toBeTruthy();
  });

  it('does not render bracket connector on last round', () => {
    const { container } = render(
      <BracketRound
        round={makeRound()}
        totalRounds={1}
        isLastRound={true}
      />
    );
    // aria-hidden connector div should not be present when isLastRound=true
    const connectors = container.querySelectorAll('[aria-hidden="true"]');
    expect(connectors.length).toBe(0);
  });

  it('renders bracket connector on non-last round', () => {
    const { container } = render(
      <BracketRound
        round={makeRound()}
        totalRounds={2}
        isLastRound={false}
      />
    );
    const connectors = container.querySelectorAll('[aria-hidden="true"]');
    expect(connectors.length).toBeGreaterThan(0);
  });
});
