import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.ts';
import { useDashboard } from './useDashboard.ts';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';

export function DashboardPage() {
  const { organizer } = useAuth();
  const { data, error, isLoading } = useDashboard();

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-1">
        Ola, {organizer?.name}
      </h1>
      <p className="text-gray-400 mb-8">Bem-vindo ao Jogo Limpo.</p>

      {isLoading && (
        <p className="text-gray-500 text-sm">Carregando...</p>
      )}

      {error && (
        <p className="text-red-400 text-center py-12">{error}</p>
      )}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <MetricCard
              label="Total arrecadado no mes"
              value={formatCurrency(data.metrics.totalCollectedThisMonth)}
            />
            <MetricCard
              label="Total pago em premios"
              value={formatCurrency(data.metrics.totalPrizePaid)}
            />
          </div>

          <section>
            <h2 className="font-display text-xl text-white mb-4">
              Lista de torneios
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
                      to={`/app/tournament/${t.id}/history`}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
                    >
                      Ver detalhes
                    </Link>
                  </article>
                ))}
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
