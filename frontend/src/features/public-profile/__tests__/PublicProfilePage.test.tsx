import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicProfilePage } from '../PublicProfilePage.tsx';

vi.mock('../usePublicProfile.ts', () => ({
  usePublicProfile: vi.fn(),
  usePublicTournament: vi.fn(),
}));

import { usePublicProfile } from '../usePublicProfile.ts';

const mockUsePublicProfile = vi.mocked(usePublicProfile);

const runningTournament = {
  publicSlug: 'copa-ao-vivo-a7x2',
  name: 'Copa ao Vivo',
  status: 'RUNNING',
  createdAt: '2026-01-10T00:00:00Z',
  startedAt: '2026-01-11T00:00:00Z',
  finishedAt: null,
  playerCount: 8,
  championName: null,
};

const finishedTournament = {
  publicSlug: 'copa-encerrada-a7x2',
  name: 'Copa Encerrada',
  status: 'FINISHED',
  createdAt: '2026-01-01T00:00:00Z',
  startedAt: '2026-01-02T00:00:00Z',
  finishedAt: '2026-01-03T00:00:00Z',
  playerCount: 16,
  championName: 'Pedro Santos',
};

function renderPage(slug = 'joao-a7x2') {
  return render(
    <MemoryRouter initialEntries={[`/organizer/${slug}`]}>
      <Routes>
        <Route path="/organizer/:slug" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>
  );
}

function makeHookResult(overrides: Partial<ReturnType<typeof usePublicProfile>> = {}) {
  return {
    data: {
      name: 'João Silva',
      tournaments: [],
      pagination: { page: 1, limit: 8, total: 0, hasMore: false },
    },
    error: null,
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    refetch: vi.fn(),
    loadMore: vi.fn(),
    ...overrides,
  };
}

describe('PublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while running list is loading', () => {
    mockUsePublicProfile.mockImplementation((_, options) =>
      makeHookResult({
        isLoading: options?.status === 'RUNNING',
      })
    );

    renderPage();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('shows guided error when running list fails', () => {
    mockUsePublicProfile.mockImplementation((_, options) =>
      makeHookResult({
        data: null,
        error:
          options?.status === 'RUNNING'
            ? {
                kind: 'public_link',
                what: 'Link invalido ou torneio nao encontrado.',
                why: 'O endereco pode estar incompleto ou desatualizado.',
                next: 'Volte para a pagina principal e abra o link novamente.',
              }
            : null,
      })
    );

    renderPage();
    expect(
      screen.getByText(/link invalido ou torneio nao encontrado/i)
    ).toBeInTheDocument();
  });

  it('renders running tournaments and hides history by default', () => {
    mockUsePublicProfile.mockImplementation((_, options) => {
      if (options?.status === 'FINISHED') {
        return makeHookResult({
          data: {
            name: 'João Silva',
            tournaments: [finishedTournament],
            pagination: { page: 1, limit: 6, total: 1, hasMore: false },
          },
        });
      }
      return makeHookResult({
        data: {
          name: 'João Silva',
          tournaments: [runningTournament],
          pagination: { page: 1, limit: 8, total: 1, hasMore: false },
        },
      });
    });

    renderPage();
    expect(screen.getByText('Copa ao Vivo')).toBeInTheDocument();
    expect(screen.queryByText('Copa Encerrada')).toBeNull();
  });

  it('loads and shows finished history after toggle', () => {
    mockUsePublicProfile.mockImplementation((_, options) => {
      if (options?.status === 'FINISHED') {
        return makeHookResult({
          data: {
            name: 'João Silva',
            tournaments: [finishedTournament],
            pagination: { page: 1, limit: 6, total: 1, hasMore: false },
          },
          isLoading: false,
        });
      }
      return makeHookResult({
        data: {
          name: 'João Silva',
          tournaments: [runningTournament],
          pagination: { page: 1, limit: 8, total: 1, hasMore: false },
        },
      });
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /mostrar histórico público/i }));
    expect(screen.getByText('Copa Encerrada')).toBeInTheDocument();
    expect(screen.getByText(/pedro santos/i)).toBeInTheDocument();
  });

  it('uses slug-based tournament links', () => {
    mockUsePublicProfile.mockImplementation((_, options) =>
      options?.status === 'RUNNING'
        ? makeHookResult({
            data: {
              name: 'João Silva',
              tournaments: [runningTournament],
              pagination: { page: 1, limit: 8, total: 1, hasMore: false },
            },
          })
        : makeHookResult()
    );

    renderPage();
    const links = screen.getAllByRole('link');
    const tournamentLink = links.find((link) =>
      link.getAttribute('href')?.includes('/tournament/')
    );
    expect(tournamentLink?.getAttribute('href')).toBe(
      `/tournament/${runningTournament.publicSlug}`
    );
  });
});
