import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TournamentHistoryPage } from './TournamentHistoryPage.tsx';

vi.mock('./useTournamentDetails.ts', () => ({
  useTournamentDetails: vi.fn(),
}));

vi.mock('../tv/useBracketData.ts', () => ({
  useBracketData: vi.fn(),
}));

import { useTournamentDetails } from './useTournamentDetails.ts';
import { useBracketData } from '../tv/useBracketData.ts';

const mockUseTournamentDetails = vi.mocked(useTournamentDetails);
const mockUseBracketData = vi.mocked(useBracketData);

function renderPage(path = '/app/tournament/t-1/history') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/tournament/:tournamentId/history" element={<TournamentHistoryPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TournamentHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra acoes de compartilhamento no historico finalizado', () => {
    mockUseTournamentDetails.mockReturnValue({
      data: {
        id: 't-1',
        publicSlug: 'copa-amigos-a7x2',
        name: 'Copa Amigos',
        status: 'FINISHED',
        playerCount: 2,
        organizerName: 'Arthur',
        drawSeed: 'seed-123',
        entryFee: 50,
        organizerPercentage: 10,
        championPercentage: 70,
        runnerUpPercentage: 30,
        thirdPlacePercentage: 0,
        fourthPlacePercentage: 0,
        firstPlacePercentage: 70,
        secondPlacePercentage: 30,
        calculatedPrizePool: 90,
        calculatedOrganizerAmount: 10,
        prizePool: 90,
        totalCollected: 100,
        organizerAmount: 10,
        championPrize: 63,
        runnerUpPrize: 27,
        thirdPlacePrize: 0,
        fourthPlacePrize: 0,
        firstPlacePrize: 63,
        secondPlacePrize: 27,
        champion: { id: 'p-1', name: 'Gamora' },
        runnerUp: { id: 'p-2', name: 'Simba' },
        createdAt: '2026-02-19T12:00:00.000Z',
        startedAt: '2026-02-19T12:00:00.000Z',
        finishedAt: '2026-02-19T13:00:00.000Z',
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseBracketData.mockReturnValue({
      data: {
        tournament: {
          id: 't-1',
          name: 'Copa Amigos',
          status: 'FINISHED',
          startedAt: '2026-02-19T12:00:00.000Z',
          finishedAt: '2026-02-19T13:00:00.000Z',
        },
        totalRounds: 1,
        champion: { id: 'p-1', name: 'Gamora' },
        rounds: [
          {
            id: 'r-1',
            roundNumber: 1,
            label: 'Final',
            matches: [
              {
                id: 'm-1',
                positionInBracket: 1,
                player1: { id: 'p-1', name: 'Gamora' },
                player2: { id: 'p-2', name: 'Simba' },
                winner: { id: 'p-1', name: 'Gamora' },
                player1Score: 1,
                player2Score: 0,
                isBye: false,
                finishedAt: '2026-02-19T13:00:00.000Z',
              },
            ],
          },
        ],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole('button', { name: /compartilhar resultado/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /compartilhar no whatsapp/i })
    ).toBeInTheDocument();
  });
});
