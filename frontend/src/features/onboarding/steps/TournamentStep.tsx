interface TournamentStepProps {
  value: string;
  prizePool?: number;
  onChange: (value: string) => void;
  onPrizePoolChange: (value?: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TournamentStep({
  value,
  prizePool,
  onChange,
  onPrizePoolChange,
  onNext,
  onBack,
}: TournamentStepProps) {
  return (
    <div>
      <h2 className="font-display text-3xl text-white mb-2">
        Nome do torneio
      </h2>
      <p className="text-gray-400 mb-8">Como este torneio sera chamado?</p>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onNext();
        }}
        placeholder="Ex: Torneio de Quinta"
        autoFocus
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
      />

      <div className="mt-6">
        <label className="block text-sm text-gray-400 mb-2">
          Premiacao (opcional)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            R$
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={prizePool ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onPrizePoolChange(v === '' ? undefined : Number(v));
            }}
            placeholder="0"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!value.trim()}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold py-3 rounded-lg transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
