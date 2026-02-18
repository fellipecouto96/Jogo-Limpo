import { useState } from 'react';

interface ScoreInputProps {
  player1Name: string;
  player2Name: string;
  initialScore1?: number;
  initialScore2?: number;
  onConfirm: (score1: number, score2: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ScoreInput({
  player1Name,
  player2Name,
  initialScore1 = 0,
  initialScore2 = 0,
  onConfirm,
  onCancel,
  disabled = false,
}: ScoreInputProps) {
  const [score1, setScore1] = useState(initialScore1);
  const [score2, setScore2] = useState(initialScore2);

  const isValid = score1 !== score2;
  const winner = score1 > score2 ? player1Name : score2 > score1 ? player2Name : null;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(score1, score2);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0f172a] rounded-xl border border-gray-700">
      <div className="text-center text-sm text-gray-400 font-medium">
        Placar (opcional)
      </div>

      <div className="flex items-center justify-between gap-4">
        <ScoreCounter
          playerName={player1Name}
          score={score1}
          onIncrement={() => setScore1((s) => s + 1)}
          onDecrement={() => setScore1((s) => Math.max(0, s - 1))}
          isWinner={score1 > score2}
          disabled={disabled}
        />

        <div className="text-2xl font-bold text-gray-500">×</div>

        <ScoreCounter
          playerName={player2Name}
          score={score2}
          onIncrement={() => setScore2((s) => s + 1)}
          onDecrement={() => setScore2((s) => Math.max(0, s - 1))}
          isWinner={score2 > score1}
          disabled={disabled}
        />
      </div>

      {score1 === score2 && (score1 > 0 || score2 > 0) && (
        <div className="text-center text-sm text-amber-400">
          Empate não é permitido
        </div>
      )}

      {winner && (
        <div className="text-center text-sm text-emerald-400">
          Vencedor: {winner}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 py-3 px-4 rounded-xl bg-gray-700 text-gray-200 font-semibold
                     active:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={disabled || !isValid}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold
                     active:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

interface ScoreCounterProps {
  playerName: string;
  score: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isWinner: boolean;
  disabled?: boolean;
}

function ScoreCounter({
  playerName,
  score,
  onIncrement,
  onDecrement,
  isWinner,
  disabled = false,
}: ScoreCounterProps) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <span
        className={`text-sm font-medium truncate max-w-[100px] ${
          isWinner ? 'text-emerald-400' : 'text-gray-300'
        }`}
      >
        {playerName}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled || score === 0}
          className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold text-white
                     active:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center"
          aria-label={`Diminuir placar de ${playerName}`}
        >
          −
        </button>

        <span
          className={`w-14 text-center text-4xl font-bold tabular-nums ${
            isWinner ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {score}
        </span>

        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled}
          className="w-12 h-12 rounded-full bg-emerald-600 text-2xl font-bold text-white
                     active:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center"
          aria-label={`Aumentar placar de ${playerName}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
