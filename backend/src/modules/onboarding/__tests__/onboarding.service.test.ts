import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaTransactionMock = vi.fn();
const generateDrawMock = vi.fn();
const calculateFinancialsMock = vi.fn();
const generateUniqueTournamentSlugMock = vi.fn();

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    $transaction: prismaTransactionMock,
  },
}));

vi.mock('../../draw/draw.service.js', () => ({
  generateDraw: generateDrawMock,
}));

vi.mock('../../tournament/financials.js', () => ({
  calculateFinancials: calculateFinancialsMock,
}));

vi.mock('../../tournament/public-slug.js', () => ({
  generateUniqueTournamentSlug: generateUniqueTournamentSlugMock,
}));

import { runOnboardingSetup } from '../onboarding.service.js';

describe('runOnboardingSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calculateFinancialsMock.mockReturnValue({
      totalCollected: 0,
      organizerAmount: 0,
      prizePool: 0,
      championPrize: 0,
      runnerUpPrize: 0,
      thirdPlacePrize: 0,
      fourthPlacePrize: 0,
      firstPlacePrize: 0,
      secondPlacePrize: 0,
    });
    generateUniqueTournamentSlugMock.mockResolvedValue('copa-1');
    generateDrawMock.mockResolvedValue({
      tournamentId: 't-1',
      seed: 'seed',
      totalRounds: 5,
      firstRoundMatches: 16,
      byeCount: 0,
      generatedAt: new Date().toISOString(),
    });
  });

  it('creates players in bulk and returns generated ids', async () => {
    const tx = {
      tournament: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 't-1' }),
      },
      player: {
        createMany: vi.fn().mockResolvedValue({ count: 32 }),
      },
    };

    prismaTransactionMock.mockImplementation(async (callback: (trx: typeof tx) => Promise<unknown>) =>
      callback(tx)
    );

    const playerNames = Array.from({ length: 32 }, (_, i) => `Jogador ${i + 1}`);

    const result = await runOnboardingSetup({
      organizerId: 'org-1',
      tournamentName: 'Copa Grande',
      playerNames,
      entryFee: 50,
      organizerPercentage: 10,
      championPercentage: 50,
      runnerUpPercentage: 30,
      thirdPlacePercentage: 15,
      fourthPlacePercentage: 5,
    });

    expect(tx.player.createMany).toHaveBeenCalledTimes(1);
    const payload = tx.player.createMany.mock.calls[0][0];
    expect(payload.data).toHaveLength(32);
    expect(result.playerIds).toHaveLength(32);
    expect(new Set(result.playerIds).size).toBe(32);
    expect(generateDrawMock).toHaveBeenCalledWith('t-1', result.playerIds);
  });
});
