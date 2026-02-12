import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OnboardingData, OnboardingResult } from './types.ts';
import { TournamentStep } from './steps/TournamentStep.tsx';
import { PlayersStep } from './steps/PlayersStep.tsx';
import { apiFetch } from '../../shared/api.ts';

const STEP_LABELS = ['Torneio', 'Jogadores', 'Sorteio'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    tournamentName: '',
    playerNames: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOnboarding = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch('/onboarding/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      const result: OnboardingResult = await res.json();
      navigate(`/tournament/${result.tournamentId}/tv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setIsSubmitting(false);
    }
  };

  const handlePlayersNext = () => {
    setStep(2);
    submitOnboarding();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-1.5 mb-10">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={[
                  'h-1 rounded-full transition-colors',
                  i <= step ? 'bg-emerald-500' : 'bg-gray-800',
                ].join(' ')}
              />
              <p
                className={[
                  'text-xs mt-1.5 transition-colors',
                  i <= step ? 'text-gray-300' : 'text-gray-600',
                ].join(' ')}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Steps */}
        {step === 0 && (
          <TournamentStep
            value={data.tournamentName}
            prizePool={data.prizePool}
            onChange={(v) => setData({ ...data, tournamentName: v })}
            onPrizePoolChange={(v) => setData({ ...data, prizePool: v })}
            onNext={() => setStep(1)}
            onBack={() => navigate('/app')}
          />
        )}

        {step === 1 && (
          <PlayersStep
            value={data.playerNames}
            onChange={(v) => setData({ ...data, playerNames: v })}
            onNext={handlePlayersNext}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && (
          <div className="text-center">
            <h2 className="font-display text-3xl text-white mb-4">
              {isSubmitting ? 'Sorteando...' : 'Pronto!'}
            </h2>
            {isSubmitting && (
              <div className="flex justify-center gap-2 mt-6">
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
            )}
            {error && (
              <div className="mt-4">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="bg-gray-800 text-white font-bold px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
