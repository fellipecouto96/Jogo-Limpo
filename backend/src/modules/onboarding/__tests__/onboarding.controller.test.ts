import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

const { runOnboardingSetupMock } = vi.hoisted(() => ({
  runOnboardingSetupMock: vi.fn(),
}));

vi.mock('../onboarding.service.js', () => {
  class OnboardingError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number
    ) {
      super(message);
      this.name = 'OnboardingError';
    }
  }

  return {
    runOnboardingSetup: runOnboardingSetupMock,
    OnboardingError,
  };
});

vi.mock('../../draw/draw.service.js', () => {
  class DrawError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number
    ) {
      super(message);
      this.name = 'DrawError';
    }
  }

  return { DrawError };
});

import { setupOnboarding } from '../onboarding.controller.js';
import { OnboardingError } from '../onboarding.service.js';

interface OnboardingRequestBody {
  tournamentName: string;
  playerNames: string[];
  entryFee?: number;
  organizerPercentage?: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  fourthPlacePercentage?: number | null;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

type OnboardingRequest = FastifyRequest<{ Body: OnboardingRequestBody }>;

function createReplyMock() {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  return {
    reply: { status } as unknown as FastifyReply,
    status,
    send,
  };
}

describe('setupOnboarding controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('repassa fourthPlacePercentage para o servico', async () => {
    runOnboardingSetupMock.mockResolvedValue({
      organizerId: 'org-1',
      tournamentId: 't-1',
      playerIds: ['p-1', 'p-2'],
    });

    const request = {
      user: { sub: 'org-1' },
      body: {
        tournamentName: 'Copa',
        playerNames: ['Ana', 'Bia', 'Caio', 'Dani'],
        entryFee: 50,
        organizerPercentage: 10,
        championPercentage: 70,
        runnerUpPercentage: 10,
        thirdPlacePercentage: 10,
        fourthPlacePercentage: 10,
      },
    } as unknown as OnboardingRequest;

    const { reply, status, send } = createReplyMock();

    await setupOnboarding(request, reply);

    expect(runOnboardingSetupMock).toHaveBeenCalledWith({
      organizerId: 'org-1',
      tournamentName: 'Copa',
      playerNames: ['Ana', 'Bia', 'Caio', 'Dani'],
      entryFee: 50,
      organizerPercentage: 10,
      championPercentage: 70,
      runnerUpPercentage: 10,
      thirdPlacePercentage: 10,
      fourthPlacePercentage: 10,
      firstPlacePercentage: undefined,
      secondPlacePercentage: undefined,
    });
    expect(status).toHaveBeenCalledWith(201);
    expect(send).toHaveBeenCalledWith({
      organizerId: 'org-1',
      tournamentId: 't-1',
      playerIds: ['p-1', 'p-2'],
    });
  });

  it('retorna erro guiado quando validacao falha', async () => {
    runOnboardingSetupMock.mockRejectedValue(
      new OnboardingError('A divisao da premiacao precisa fechar 100%', 400)
    );

    const request = {
      user: { sub: 'org-1' },
      body: {
        tournamentName: 'Copa',
        playerNames: ['Ana', 'Bia'],
      },
    } as unknown as OnboardingRequest;

    const { reply, status, send } = createReplyMock();

    await setupOnboarding(request, reply);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: 'A divisao da premiacao precisa fechar 100%',
    });
  });
});
