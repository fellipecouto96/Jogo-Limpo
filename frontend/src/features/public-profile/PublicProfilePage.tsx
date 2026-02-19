import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from './usePublicProfile.ts';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, isLoading, refetch } = usePublicProfile(slug!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-lg">Carregando...</p>
      </div>
    );
  }

  if (error || !data) {
    const guidedError = error ?? resolveGuidedSystemError({ context: 'public_link' });
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="mx-auto w-full max-w-lg">
          <GuidedErrorCard error={guidedError} onRetry={refetch} />
        </div>
      </div>
    );
  }

  const running = data.tournaments.filter((t) => t.status === 'RUNNING');
  const finished = data.tournaments.filter((t) => t.status === 'FINISHED');
  const sorted = [...running, ...finished];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data.tournaments.length} torneio{data.tournaments.length !== 1 ? 's' : ''}
          </p>
        </header>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-500 text-sm">Nenhum torneio disponivel.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((t) => (
              <Link
                key={t.id}
                to={`/organizer/${slug}/tournament/${t.id}`}
                className="block rounded-2xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white truncate">
                      {t.name}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t.playerCount} jogador{t.playerCount === 1 ? '' : 'es'}
                      {' · '}
                      {formatDate(t.startedAt ?? t.createdAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={t.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'}
                  />
                </div>
                {t.championName && (
                  <p className="text-sm text-emerald-400">
                    Campeao: {t.championName}
                  </p>
                )}
                {t.entryFee !== null && (
                  <p className="text-sm text-gray-400 mt-1">
                    Entrada: {formatCurrency(t.entryFee)}
                    {t.prizePool !== null && ` · Premiacao: ${formatCurrency(t.prizePool)}`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
