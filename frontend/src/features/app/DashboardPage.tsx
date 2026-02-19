import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.ts';
import { useDashboard } from './useDashboard.ts';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { useOnboarding } from '../../shared/useOnboarding.ts';
import { QRCodeSection } from './QRCodeSection.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { parseGuidedSystemErrorText } from '../../shared/systemErrors.ts';

export function DashboardPage() {
  const { organizer } = useAuth();
  const { data, error, isLoading, refetch } = useDashboard();
  const hasTournaments = data ? data.tournaments.length > 0 : undefined;
  const { showWelcome, dismissWelcome } = useOnboarding(hasTournaments);

  if (showWelcome) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-md flex-col items-center justify-center text-center">
        <h1 className="mb-3 font-display text-3xl text-white">
          Vamos organizar seu primeiro torneio?
        </h1>
        <p className="mb-8 text-base text-gray-300">
          Você cria, adiciona os jogadores e o sistema cuida do resto.
        </p>
        <Link
          to="/app/new"
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 text-lg font-bold text-gray-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60 [touch-action:manipulation]"
        >
          Criar torneio
        </Link>
        <button
          type="button"
          onClick={dismissWelcome}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/60 [touch-action:manipulation]"
        >
          Explorar primeiro
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-1">
        Ola, {organizer?.name}
      </h1>
      <p className="text-gray-400 mb-8">Seu painel de torneios.</p>

      {isLoading && (
        <p className="text-gray-500 text-sm">Carregando...</p>
      )}

      {error && (
        <div className="py-4">
          <GuidedErrorCard
            error={parseGuidedSystemErrorText(error)}
            onRetry={refetch}
          />
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <MetricCard
              label="Total arrecadado no mês"
              value={formatCurrency(data.metrics.totalCollectedThisMonth)}
            />
            <MetricCard
              label="Total pago em prêmios"
              value={formatCurrency(data.metrics.totalPrizePaid)}
            />
          </div>

          {/* QR / Divulgacao section */}
          {organizer?.publicSlug && (
            <div className="mb-8">
              <QRCodeSection
                slug={organizer.publicSlug}
                organizerName={organizer.name}
              />
            </div>
          )}

          <section>
            <h2 className="font-display text-xl text-white mb-4">
              Seus torneios
            </h2>
            {data.tournaments.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">
                  Nenhum torneio encontrado.
                </p>
                <Link
                  to="/app/new"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 mt-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
                >
                  Criar torneio
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.tournaments.map((t) => (
                  <article
                    key={t.id}
                    className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-white truncate">
                          {t.name}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {t.playerCount} jogador{t.playerCount === 1 ? '' : 'es'} · {formatDate(t.startedAt ?? t.createdAt)}
                        </p>
                      </div>
                      <StatusBadge
                        status={t.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'}
                      />
                    </div>
                    <Link
                      to={t.status === 'RUNNING' ? `/app/tournament/${t.id}` : `/app/tournament/${t.id}/history`}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
                    >
                      {t.status === 'RUNNING' ? 'Gerenciar' : t.status === 'FINISHED' ? 'Ver resultado' : 'Ver detalhes'}
                    </Link>
                  </article>
                ))}

                {data.pagination.hasMore && (
                  <Link
                    to="/app/tournaments"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    Ver todos os torneios ({data.pagination.total})
                  </Link>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}
