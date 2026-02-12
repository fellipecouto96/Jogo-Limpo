import { useState } from 'react';

interface PlayersStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function PlayersStep({
  value,
  onChange,
  onNext,
  onBack,
}: PlayersStepProps) {
  const [input, setInput] = useState('');

  const addPlayer = () => {
    const name = input.trim();
    if (name && !value.includes(name)) {
      onChange([...value, name]);
      setInput('');
    }
  };

  const removePlayer = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const canProceed = value.length >= 2 && isPowerOfTwo(value.length);
  const nextPowerOfTwo =
    value.length < 2
      ? 2
      : isPowerOfTwo(value.length)
        ? value.length
        : Math.pow(2, Math.ceil(Math.log2(value.length)));

  return (
    <div>
      <h2 className="font-display text-3xl text-white mb-2">Jogadores</h2>
      <p className="text-gray-400 mb-8">
        Adicione os participantes. O total precisa ser potencia de 2 (2, 4,
        8, 16...).
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPlayer();
            }
          }}
          placeholder="Nome do jogador"
          autoFocus
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={addPlayer}
          disabled={!input.trim()}
          className="bg-gray-800 text-white font-bold px-5 py-3 rounded-lg hover:bg-gray-700 disabled:text-gray-600 transition-colors"
        >
          +
        </button>
      </div>

      {value.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {value.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5 text-sm text-white"
            >
              {name}
              <button
                onClick={() => removePlayer(index)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                aria-label={`Remover ${name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6">
        {value.length} jogador{value.length !== 1 ? 'es' : ''} adicionado
        {value.length !== 1 ? 's' : ''}
        {!canProceed && value.length > 0 && (
          <span className="text-amber-400">
            {' '}
            &middot; Precisa de {nextPowerOfTwo} para continuar
          </span>
        )}
        {canProceed && (
          <span className="text-emerald-400"> &middot; Pronto!</span>
        )}
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold py-3 rounded-lg transition-colors"
        >
          Sortear chaves
        </button>
      </div>
    </div>
  );
}
