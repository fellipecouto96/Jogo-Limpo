import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
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
          {/* Summary metrics */}
          <div className="grid gap-4 sm:grid-cols-3 mb-10">
            <MetricCard
              label="Total de torneios"
              value={String(data.metrics.totalTournaments)}
            />
            <MetricCard
              label="Total de jogadores"
              value={String(data.metrics.totalPlayers)}
            />
            <MetricCard
              label="Premiacao distribuida"
              value={formatCurrency(data.metrics.totalPrizeDistributed)}
            />
          </div>

          {/* Active tournaments */}
          <section className="mb-10">
            <h2 className="font-display text-xl text-white mb-4">
              Torneios ativos
            </h2>
            {data.activeTournaments.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">
                  Nenhum torneio ativo no momento.
                </p>
                <Link
                  to="/app/new"
                  className="inline-block mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Criar torneio
                </Link>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left text-gray-500 uppercase tracking-wider text-xs">
                        <th className="px-5 py-3 font-medium">Nome</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Jogadores</th>
                        <th className="px-5 py-3 font-medium">Data</th>
                        <th className="px-5 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {data.activeTournaments.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-white font-medium">
                            {t.name}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge
                              status={t.status as 'OPEN' | 'RUNNING'}
                            />
                          </td>
                          <td className="px-5 py-3.5 text-gray-400">
                            {t.playerCount}
                          </td>
                          <td className="px-5 py-3.5 text-gray-400">
                            {formatDate(t.startedAt ?? t.createdAt)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              to={`/tournament/${t.id}/tv`}
                              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold uppercase tracking-wider transition-colors"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Finished tournaments */}
          <section>
            <h2 className="font-display text-xl text-white mb-4">
              Torneios finalizados
            </h2>
            {data.finishedTournaments.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">
                  Nenhum torneio finalizado ainda.
                </p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left text-gray-500 uppercase tracking-wider text-xs">
                        <th className="px-5 py-3 font-medium">Nome</th>
                        <th className="px-5 py-3 font-medium">Campeao</th>
                        <th className="px-5 py-3 font-medium">Vice</th>
                        <th className="px-5 py-3 font-medium">Jogadores</th>
                        <th className="px-5 py-3 font-medium">Premiacao</th>
                        <th className="px-5 py-3 font-medium">Data</th>
                        <th className="px-5 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {data.finishedTournaments.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-white font-medium">
                            {t.name}
                          </td>
                          <td className="px-5 py-3.5 text-amber-400">
                            {t.champion?.name ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-400">
                            {t.runnerUp?.name ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-400">
                            {t.playerCount}
                          </td>
                          <td className="px-5 py-3.5 text-gray-400">
                            {t.prizePool != null
                              ? formatCurrency(t.prizePool)
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-400">
                            {t.finishedAt ? formatDate(t.finishedAt) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              to={`/tournament/${t.id}/tv`}
                              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold uppercase tracking-wider transition-colors"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}
