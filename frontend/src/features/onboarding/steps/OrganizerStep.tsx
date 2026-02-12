interface OrganizerStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function OrganizerStep({ value, onChange, onNext }: OrganizerStepProps) {
  return (
    <div>
      <h2 className="font-display text-3xl text-white mb-2">
        Quem organiza?
      </h2>
      <p className="text-gray-400 mb-8">
        Nome do organizador ou do estabelecimento.
      </p>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onNext();
        }}
        placeholder="Ex: Bar do Chico"
        autoFocus
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
      />

      <button
        onClick={onNext}
        disabled={!value.trim()}
        className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold py-3 rounded-lg transition-colors"
      >
        Continuar
      </button>
    </div>
  );
}
