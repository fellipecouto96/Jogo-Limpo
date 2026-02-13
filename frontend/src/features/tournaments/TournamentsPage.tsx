import { useTournaments } from './useTournaments.ts';
import { Link } from 'react-router-dom';

export function TournamentsPage() {
  const { data: tournaments, error, isLoading } = useTournaments();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-white mb-3">Torneios</h1>
        <p className="text-base text-gray-300">
          Crie e inicie um torneio em menos de 2 minutos.
        </p>
      </div>

      <Link
        to="/app/new"
        className="mb-8 flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 text-xl font-bold text-gray-950 shadow-[0_14px_32px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60"
      >
        Criar novo torneio
      </Link>

      {isLoading && (
        <p className="text-gray-300 text-center py-12 text-lg">Carregando...</p>
      )}

      {error && (
        <p className="text-red-300 text-center py-12 text-lg">{error}</p>
      )}

      {!isLoading && !error && tournaments.length === 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-5 py-10 text-center text-gray-300">
          Nenhum torneio criado ainda.
        </div>
      )}

      {!isLoading && !error && tournaments.length > 0 && (
        <ul className="space-y-3">
          {tournaments.map((t) => {
            const status =
              t.status === 'RUNNING'
                ? 'Em andamento'
                : t.status === 'FINISHED'
                  ? 'Finalizado'
                  : 'Aguardando';
            return (
              <li key={t.id}>
                <Link
                  to={`/app/tournament/${t.id}`}
                  className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 transition hover:border-gray-600 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">{t.name}</p>
                    <p className="text-base text-gray-300">
                      {t.playerCount} jogadores · {status}
                    </p>
                  </div>
                  <span className="text-base font-semibold text-emerald-300">
                    Abrir
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
