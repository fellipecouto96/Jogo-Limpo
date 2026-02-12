interface TournamentStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TournamentStep({
  value,
  onChange,
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
