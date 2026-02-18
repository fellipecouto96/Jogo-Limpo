import { useState } from 'react';

interface PlayersStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlayersStep({
  value,
  onChange,
  onNext,
  onBack,
}: PlayersStepProps) {
  const [input, setInput] = useState('');
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);

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

  const handlePasteList = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const names = text
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      
      if (names.length === 0) {
        setPasteMessage('Nenhum nome encontrado na área de transferência');
        setTimeout(() => setPasteMessage(null), 3000);
        return;
      }

      const uniqueNames = names.filter((n) => !value.includes(n));
      const duplicates = names.length - uniqueNames.length;
      
      if (uniqueNames.length > 0) {
        onChange([...value, ...uniqueNames]);
      }
      
      const message = duplicates > 0
        ? `${uniqueNames.length} jogador(es) adicionado(s), ${duplicates} duplicado(s) ignorado(s)`
        : `${uniqueNames.length} jogador(es) adicionado(s)`;
      setPasteMessage(message);
      setTimeout(() => setPasteMessage(null), 3000);
    } catch {
      setPasteMessage('Não foi possível acessar a área de transferência');
      setTimeout(() => setPasteMessage(null), 3000);
    }
  };

  const canProceed = value.length >= 2;

  return (
    <div>
      <h2 className="font-display text-3xl text-white mb-2">Jogadores</h2>
      <p className="text-gray-400 mb-6">
        Digite o nome e toque + ou Enter. Mínimo 2 jogadores para iniciar o sorteio.
      </p>

      <div className="flex gap-2 mb-3">
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
          aria-label="Adicionar jogador"
          className="bg-gray-800 text-white font-bold min-w-14 h-14 rounded-lg hover:bg-gray-700 disabled:text-gray-600 transition-colors [touch-action:manipulation]"
        >
          +
        </button>
      </div>

      <button
        onClick={handlePasteList}
        type="button"
        className="w-full mb-4 py-2.5 px-4 rounded-lg border border-dashed border-gray-600 text-sm text-gray-400 
                   hover:border-emerald-500 hover:text-emerald-400 transition-colors [touch-action:manipulation]"
      >
        📋 Colar lista (nomes separados por linha ou vírgula)
      </button>

      {pasteMessage && (
        <p className="text-sm text-emerald-400 mb-3">{pasteMessage}</p>
      )}

      {value.length > 0 && (
        <div className="mb-4 max-h-[50vh] overflow-y-auto flex flex-wrap gap-2 content-start">
          {value.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5 text-sm text-white"
            >
              {name}
              <button
                onClick={() => removePlayer(index)}
                className="text-gray-500 hover:text-red-400 transition-colors [touch-action:manipulation]"
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
