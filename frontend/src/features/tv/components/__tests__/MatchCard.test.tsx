import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BracketMatch } from '../../types.ts';
import { MatchCard } from '../MatchCard.tsx';

// Note: MatchCard internally shows scores when both player1Score and player2Score are non-null.
// There is no external showScore prop — it's computed from hasScores internally.

function makeMatch(overrides: Partial<BracketMatch> = {}): BracketMatch {
  return {
    id: 'm-1',
    positionInBracket: 1,
    player1: { id: 'p-1', name: 'Ana' },
    player2: { id: 'p-2', name: 'Bruno' },
    winner: null,
    player1Score: null,
    player2Score: null,
    isBye: false,
    finishedAt: null,
    ...overrides,
  };
}

describe('MatchCard', () => {
  describe('basic rendering', () => {
    it('shows both player names', () => {
      render(<MatchCard match={makeMatch()} />);
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Bruno')).toBeInTheDocument();
    });

    it('shows TBD when player2 is null', () => {
      render(<MatchCard match={makeMatch({ player2: null })} />);
      expect(screen.getAllByText('TBD').length).toBeGreaterThan(0);
    });

    it('marks winner with ▶ arrow', () => {
      const match = makeMatch({ winner: { id: 'p-1', name: 'Ana' } });
      render(<MatchCard match={match} />);
      expect(screen.getByLabelText('vencedor')).toBeInTheDocument();
    });

    it('renders null match as two TBD slots', () => {
      render(<MatchCard match={null} />);
      expect(screen.getAllByText('TBD').length).toBe(2);
    });
  });

  describe('isRebuy badge', () => {
    it('shows 🔁 badge for player1 with isRebuy=true', () => {
      const match = makeMatch({
        player1: { id: 'p-1', name: 'Carlos', isRebuy: true },
      });
      render(<MatchCard match={match} />);
      expect(screen.getByLabelText('repescagem')).toBeInTheDocument();
      expect(screen.getByTitle('Repescagem')).toBeInTheDocument();
    });

    it('shows 🔁 badge for player2 with isRebuy=true', () => {
      const match = makeMatch({
        player2: { id: 'p-2', name: 'Diana', isRebuy: true },
      });
      render(<MatchCard match={match} />);
      expect(screen.getByLabelText('repescagem')).toBeInTheDocument();
    });

    it('shows two 🔁 badges when both players have isRebuy=true', () => {
      const match = makeMatch({
        player1: { id: 'p-1', name: 'Eduardo', isRebuy: true },
        player2: { id: 'p-2', name: 'Fernanda', isRebuy: true },
      });
      render(<MatchCard match={match} />);
      expect(screen.getAllByLabelText('repescagem').length).toBe(2);
    });

    it('does not show 🔁 badge when isRebuy is false', () => {
      const match = makeMatch({
        player1: { id: 'p-1', name: 'Gustavo', isRebuy: false },
        player2: { id: 'p-2', name: 'Helena', isRebuy: false },
      });
      render(<MatchCard match={match} />);
      expect(screen.queryByLabelText('repescagem')).not.toBeInTheDocument();
    });

    it('does not show 🔁 badge when isRebuy is undefined', () => {
      const match = makeMatch({
        player1: { id: 'p-1', name: 'Igor' },
        player2: { id: 'p-2', name: 'Julia' },
      });
      render(<MatchCard match={match} />);
      expect(screen.queryByLabelText('repescagem')).not.toBeInTheDocument();
    });
  });

  describe('scores', () => {
    it('shows scores when both player scores are set', () => {
      const match = makeMatch({
        winner: { id: 'p-1', name: 'Ana' },
        player1Score: 3,
        player2Score: 1,
      });
      render(<MatchCard match={match} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('does not show scores when only player1Score is set (incomplete)', () => {
      const match = makeMatch({ player1Score: 3, player2Score: null });
      render(<MatchCard match={match} />);
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    it('does not show scores when both scores are null', () => {
      const match = makeMatch({ player1Score: null, player2Score: null });
      render(<MatchCard match={match} />);
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });
  });

  describe('bye match', () => {
    it('shows "Avançou automaticamente" for bye match', () => {
      const byeMatch = makeMatch({ isBye: true, winner: { id: 'p-1', name: 'Ana' } });
      render(<MatchCard match={byeMatch} />);
      expect(screen.getByText('Avançou automaticamente')).toBeInTheDocument();
    });
  });
});
