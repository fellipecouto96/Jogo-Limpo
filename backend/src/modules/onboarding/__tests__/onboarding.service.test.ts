import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../../draw/draw.service.js', () => ({
  generateDraw: vi.fn(),
}));

vi.mock('../../tournament/financials.js', () => ({
  calculateFinancials: vi.fn(),
}));

vi.mock('../../tournament/public-slug.js', () => ({
  generateUniqueTournamentSlug: vi.fn(),
}));

import { runOnboardingSetup } from '../onboarding.service.js';
import { prisma } from '../../../shared/database/prisma.js';
import { generateDraw } from '../../draw/draw.service.js';
import { calculateFinancials } from '../../tournament/financials.js';
import { generateUniqueTournamentSlug } from '../../tournament/public-slug.js';

const mockTransaction = vi.mocked(prisma.$transaction);
const mockGenerateDraw = vi.mocked(generateDraw);
const mockCalculateFinancials = vi.mocked(calculateFinancials);
const mockGenerateSlug = vi.mocked(generateUniqueTournamentSlug);

describe('runOnboardingSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateFinancials.mockReturnValue({
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
    mockGenerateSlug.mockResolvedValue('copa-1');
    mockGenerateDraw.mockResolvedValue({
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (callback: (trx: any) => Promise<unknown>) =>
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
    expect(mockGenerateDraw).toHaveBeenCalledWith('t-1', result.playerIds);
  });
});
