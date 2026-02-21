import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveMatchCard } from '../InteractiveMatchCard.tsx';
import type { BracketMatch } from '../../../tv/types.ts';

vi.mock('../../../../shared/loading/LoadingSystem.tsx', () => ({
  Spinner: () => <span data-testid="spinner" />,
}));

vi.mock('../ScoreInput.tsx', () => ({
  ScoreInput: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="score-input">
      <button onClick={onCancel}>Cancelar score</button>
    </div>
  ),
}));

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

const defaultProps = {
  roundLabel: 'Semifinal',
  tournamentStatus: 'RUNNING',
  isBusy: false,
  onSelectWinner: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Basic rendering ───────────────────────────────────────────────────────────

describe('InteractiveMatchCard – basic rendering', () => {
  it('shows both player names', () => {
    render(<InteractiveMatchCard match={makeMatch()} {...defaultProps} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
  });

  it('shows round label', () => {
    render(<InteractiveMatchCard match={makeMatch()} {...defaultProps} />);
    expect(screen.getByText('Semifinal')).toBeInTheDocument();
  });

  it('shows match position', () => {
    render(<InteractiveMatchCard match={makeMatch({ positionInBracket: 3 })} {...defaultProps} />);
    expect(screen.getByText('Partida 3')).toBeInTheDocument();
  });

  it('shows "Aguardando adversário" when player2 is null', () => {
    render(<InteractiveMatchCard match={makeMatch({ player2: null })} {...defaultProps} />);
    expect(screen.getByText('Aguardando adversário')).toBeInTheDocument();
  });

  it('shows "Avançou automaticamente" footer for bye matches', () => {
    const bye = makeMatch({ isBye: true, winner: { id: 'p-1', name: 'Ana' } });
    render(<InteractiveMatchCard match={bye} {...defaultProps} tournamentStatus="RUNNING" />);
    expect(screen.getByText('Avançou automaticamente')).toBeInTheDocument();
  });
});

// ─── Winner selection ──────────────────────────────────────────────────────────

describe('InteractiveMatchCard – winner selection', () => {
  it('calls onSelectWinner with correct player when clicking player button', () => {
    const onSelectWinner = vi.fn();
    render(
      <InteractiveMatchCard
        match={makeMatch()}
        {...defaultProps}
        onSelectWinner={onSelectWinner}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /selecionar ana como vencedor/i }));
    expect(onSelectWinner).toHaveBeenCalledWith('p-1', 'Ana');
  });

  it('does not call onSelectWinner when isBusy', () => {
    const onSelectWinner = vi.fn();
    render(
      <InteractiveMatchCard
        match={makeMatch()}
        {...defaultProps}
        isBusy={true}
        onSelectWinner={onSelectWinner}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => fireEvent.click(btn));
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it('does not call onSelectWinner when tournament is not RUNNING', () => {
    const onSelectWinner = vi.fn();
    render(
      <InteractiveMatchCard
        match={makeMatch()}
        {...defaultProps}
        tournamentStatus="FINISHED"
        onSelectWinner={onSelectWinner}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => fireEvent.click(btn));
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it('shows "Vencedor" label when match is complete (no scores)', () => {
    const match = makeMatch({ winner: { id: 'p-1', name: 'Ana' } });
    render(<InteractiveMatchCard match={match} {...defaultProps} />);
    expect(screen.getByText('Vencedor')).toBeInTheDocument();
  });
});

// ─── isRebuy badge ─────────────────────────────────────────────────────────────

describe('InteractiveMatchCard – isRebuy badge', () => {
  it('shows 🔁 badge when player1 has isRebuy=true', () => {
    const match = makeMatch({
      player1: { id: 'p-1', name: 'Carlos', isRebuy: true },
    });
    render(<InteractiveMatchCard match={match} {...defaultProps} />);
    expect(screen.getByTitle('Repescagem')).toBeInTheDocument();
  });

  it('shows 🔁 badge when player2 has isRebuy=true', () => {
    const match = makeMatch({
      player2: { id: 'p-2', name: 'Diana', isRebuy: true },
    });
    render(<InteractiveMatchCard match={match} {...defaultProps} />);
    expect(screen.getByTitle('Repescagem')).toBeInTheDocument();
  });

  it('does not show 🔁 badge when isRebuy is false', () => {
    const match = makeMatch({
      player1: { id: 'p-1', name: 'Eduardo', isRebuy: false },
      player2: { id: 'p-2', name: 'Fernanda', isRebuy: false },
    });
    render(<InteractiveMatchCard match={match} {...defaultProps} />);
    expect(screen.queryByTitle('Repescagem')).not.toBeInTheDocument();
  });

  it('does not show 🔁 badge when isRebuy is undefined', () => {
    const match = makeMatch({
      player1: { id: 'p-1', name: 'Gustavo' },
      player2: { id: 'p-2', name: 'Helena' },
    });
    render(<InteractiveMatchCard match={match} {...defaultProps} />);
    expect(screen.queryByTitle('Repescagem')).not.toBeInTheDocument();
  });
});

// ─── Rebuy button ──────────────────────────────────────────────────────────────

describe('InteractiveMatchCard – rebuy button for losers', () => {
  const loserMatch = makeMatch({ winner: { id: 'p-1', name: 'Ana' } });

  it('shows rebuy button for the loser (player2) when allowRebuy=true', () => {
    const onRebuy = vi.fn();
    render(
      <InteractiveMatchCard
        match={loserMatch}
        {...defaultProps}
        allowRebuy={true}
        onRebuy={onRebuy}
      />
    );
    expect(screen.getByText(/Repescagem/i)).toBeInTheDocument();
  });

  it('does not show rebuy button when allowRebuy=false', () => {
    render(
      <InteractiveMatchCard
        match={loserMatch}
        {...defaultProps}
        allowRebuy={false}
        onRebuy={vi.fn()}
      />
    );
    expect(screen.queryByText(/Repescagem/i)).not.toBeInTheDocument();
  });

  it('does not show rebuy button when onRebuy is not provided', () => {
    render(
      <InteractiveMatchCard
        match={loserMatch}
        {...defaultProps}
        allowRebuy={true}
      />
    );
    expect(screen.queryByText(/Repescagem/i)).not.toBeInTheDocument();
  });

  it('does not show rebuy button when isBusy=true', () => {
    render(
      <InteractiveMatchCard
        match={loserMatch}
        {...defaultProps}
        allowRebuy={true}
        onRebuy={vi.fn()}
        isBusy={true}
      />
    );
    expect(screen.queryByText(/Repescagem/i)).not.toBeInTheDocument();
  });

  it('calls onRebuy with the loser player id when clicked', () => {
    const onRebuy = vi.fn();
    render(
      <InteractiveMatchCard
        match={loserMatch}
        {...defaultProps}
        allowRebuy={true}
        onRebuy={onRebuy}
      />
    );
    fireEvent.click(screen.getByText(/Repescagem/i));
    expect(onRebuy).toHaveBeenCalledWith('p-2');
  });

  it('does not show rebuy button for the winner', () => {
    const winnerMatch = makeMatch({ winner: { id: 'p-2', name: 'Bruno' } });
    const onRebuy = vi.fn();
    render(
      <InteractiveMatchCard
        match={winnerMatch}
        {...defaultProps}
        allowRebuy={true}
        onRebuy={onRebuy}
      />
    );
    // Only one rebuy button should appear (for loser p-1)
    const rebuyButtons = screen.queryAllByText(/Repescagem/i);
    // Winner (p-2) should not have rebuy button
    expect(rebuyButtons.length).toBe(1);
  });
});

// ─── Pending / loading states ──────────────────────────────────────────────────

describe('InteractiveMatchCard – pending state', () => {
  it('shows spinner and "Registrando" when isPending=true', () => {
    render(<InteractiveMatchCard match={makeMatch()} {...defaultProps} isPending={true} />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Registrando')).toBeInTheDocument();
  });

  it('hides match position number when isPending=true', () => {
    render(<InteractiveMatchCard match={makeMatch()} {...defaultProps} isPending={true} />);
    expect(screen.queryByText(/Partida 1/)).not.toBeInTheDocument();
  });
});

// ─── Score editing ─────────────────────────────────────────────────────────────

describe('InteractiveMatchCard – score editing', () => {
  it('shows "Adicionar placar" button when match is complete and no scores', () => {
    const completedMatch = makeMatch({ winner: { id: 'p-1', name: 'Ana' } });
    const onUpdateScore = vi.fn();
    render(
      <InteractiveMatchCard
        match={completedMatch}
        {...defaultProps}
        onUpdateScore={onUpdateScore}
      />
    );
    expect(screen.getByRole('button', { name: /adicionar placar/i })).toBeInTheDocument();
  });

  it('shows "Editar placar" button when match has scores', () => {
    const scoredMatch = makeMatch({
      winner: { id: 'p-1', name: 'Ana' },
      player1Score: 3,
      player2Score: 1,
    });
    const onUpdateScore = vi.fn();
    render(
      <InteractiveMatchCard
        match={scoredMatch}
        {...defaultProps}
        onUpdateScore={onUpdateScore}
      />
    );
    expect(screen.getByRole('button', { name: /editar placar/i })).toBeInTheDocument();
  });

  it('opens score input when "Adicionar placar" is clicked', () => {
    const completedMatch = makeMatch({ winner: { id: 'p-1', name: 'Ana' } });
    render(
      <InteractiveMatchCard
        match={completedMatch}
        {...defaultProps}
        onUpdateScore={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /adicionar placar/i }));
    expect(screen.getByTestId('score-input')).toBeInTheDocument();
  });

  it('does not show score button when onUpdateScore is not provided', () => {
    const completedMatch = makeMatch({ winner: { id: 'p-1', name: 'Ana' } });
    render(<InteractiveMatchCard match={completedMatch} {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /placar/i })).not.toBeInTheDocument();
  });
});
