interface WaitingStateProps {
  tournamentName: string;
  status: 'DRAFT' | 'OPEN';
}

export function WaitingState({ tournamentName, status }: WaitingStateProps) {
  const message =
    status === 'DRAFT'
      ? 'Torneio em preparacao'
      : 'Aguardando sorteio das chaves';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-6" aria-hidden="true">
        &#127921;
      </div>
      <h2 className="text-3xl font-bold text-white mb-4">{tournamentName}</h2>
      <p className="text-xl text-gray-400">{message}</p>
      <div className="mt-8 flex gap-2">
        <span
          className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
