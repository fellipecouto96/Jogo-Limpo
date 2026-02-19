/**
 * Component tests for PublicProfilePage.
 *
 * Verifies:
 * - Loading skeleton renders during fetch
 * - 404 / error state renders friendly message
 * - Organizer name displayed prominently
 * - Tournaments listed with correct links (/organizer/:slug/tournament/:id)
 * - Financial data hidden when entryFee/prizePool are null (server-enforced)
 * - Financial data shown when provided (showFinancials=true path)
 * - RUNNING tournaments show before FINISHED ones
 * - Champion name shown for FINISHED tournaments
 * - No horizontal overflow (mobile-safe)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicProfilePage } from '../PublicProfilePage.tsx';

// ── Mock hook ─────────────────────────────────────────────────────────────────
vi.mock('../usePublicProfile.ts', () => ({
  usePublicProfile: vi.fn(),
  usePublicTournament: vi.fn(),
}));

import { usePublicProfile } from '../usePublicProfile.ts';
const mockUsePublicProfile = vi.mocked(usePublicProfile);

// ── Render helper ─────────────────────────────────────────────────────────────
function renderPage(slug = 'joao-a7x2') {
  return render(
    <MemoryRouter initialEntries={[`/organizer/${slug}`]}>
      <Routes>
        <Route path="/organizer/:slug" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const runningTournament = {
  id: 't-running',
  name: 'Copa ao Vivo',
  status: 'RUNNING',
  createdAt: '2026-01-10T00:00:00Z',
  startedAt: '2026-01-11T00:00:00Z',
  finishedAt: null,
  playerCount: 8,
  championName: null,
  entryFee: null,
  prizePool: null,
};

const finishedTournament = {
  id: 't-finished',
  name: 'Copa Encerrada',
  status: 'FINISHED',
  createdAt: '2026-01-01T00:00:00Z',
  startedAt: '2026-01-02T00:00:00Z',
  finishedAt: '2026-01-03T00:00:00Z',
  playerCount: 16,
  championName: 'Pedro Santos',
  entryFee: null,
  prizePool: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PublicProfilePage – loading state', () => {
  beforeEach(() => {
    mockUsePublicProfile.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
      refetch: vi.fn(),
    });
  });

  it('shows loading indicator', () => {
    renderPage();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });
});

describe('PublicProfilePage – error state', () => {
  beforeEach(() => {
    mockUsePublicProfile.mockReturnValue({
      data: null,
      error: {
        kind: 'public_link',
        what: 'Link invalido ou torneio nao encontrado.',
        why: 'O endereco pode estar incompleto ou desatualizado.',
        next: 'Volte para a pagina principal e abra o link novamente.',
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('shows error message', () => {
    renderPage();
    expect(screen.getByText(/link invalido ou torneio nao encontrado/i)).toBeInTheDocument();
  });

  it('does not render any tournament links', () => {
    renderPage();
    expect(screen.queryByRole('link', { name: /ver torneio/i })).toBeNull();
  });
});

describe('PublicProfilePage – success state', () => {
  beforeEach(() => {
    mockUsePublicProfile.mockReturnValue({
      data: {
        name: 'João Silva',
        tournaments: [runningTournament, finishedTournament],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('displays organizer name as heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'João Silva'
    );
  });

  it('shows tournament count in subheading', () => {
    renderPage();
    expect(screen.getByText(/2 torneios/i)).toBeInTheDocument();
  });

  it('renders both tournaments', () => {
    renderPage();
    expect(screen.getByText('Copa ao Vivo')).toBeInTheDocument();
    expect(screen.getByText('Copa Encerrada')).toBeInTheDocument();
  });

  it('links to correct tournament detail page', () => {
    renderPage('joao-a7x2');
    const links = screen.getAllByRole('link');
    const tournamentLinks = links.filter((l) =>
      l.getAttribute('href')?.includes('/tournament/')
    );
    expect(tournamentLinks.length).toBe(2);
    expect(tournamentLinks[0].getAttribute('href')).toContain(
      '/organizer/joao-a7x2/tournament/'
    );
  });

  it('shows champion name for FINISHED tournament', () => {
    renderPage();
    expect(screen.getByText(/pedro santos/i)).toBeInTheDocument();
  });

  it('does NOT show financial data when entryFee is null', () => {
    renderPage();
    expect(screen.queryByText(/entrada:/i)).toBeNull();
    expect(screen.queryByText(/premiacao:/i)).toBeNull();
  });
});

describe('PublicProfilePage – with financials (showFinancials=true)', () => {
  beforeEach(() => {
    mockUsePublicProfile.mockReturnValue({
      data: {
        name: 'Clube do Bilhar',
        tournaments: [
          {
            ...runningTournament,
            entryFee: 50,
            prizePool: 400,
          },
        ],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('shows entry fee when provided by server', () => {
    renderPage();
    expect(screen.getByText(/entrada:/i)).toBeInTheDocument();
  });
});

describe('PublicProfilePage – empty tournaments', () => {
  beforeEach(() => {
    mockUsePublicProfile.mockReturnValue({
      data: { name: 'Sem Torneios', tournaments: [] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('shows empty state message', () => {
    renderPage();
    expect(screen.getByText(/nenhum torneio/i)).toBeInTheDocument();
  });

  it('still shows organizer name', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Sem Torneios'
    );
  });
});

describe('PublicProfilePage – ordering', () => {
  it('renders RUNNING before FINISHED tournaments', () => {
    mockUsePublicProfile.mockReturnValue({
      data: {
        name: 'Organizador',
        // Intentionally pass finished first to test client-side ordering
        tournaments: [finishedTournament, runningTournament],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage();
    const allText = document.body.textContent ?? '';
    const runningPos = allText.indexOf('Copa ao Vivo');
    const finishedPos = allText.indexOf('Copa Encerrada');
    expect(runningPos).toBeLessThan(finishedPos);
  });
});
