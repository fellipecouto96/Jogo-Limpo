import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { OnboardingData, OnboardingResult } from './types.ts';
import { apiFetch } from '../../shared/api.ts';

const MIN_PLAYERS = 2;
const REQUIRE_DOUBLE_TAP_CONFIRM = false;
const STEP_LABELS = ['Dados', 'Jogadores'];
const DEFAULT_ORGANIZER_PERCENTAGE = 10;
const DEFAULT_CHAMPION_PERCENTAGE = 70;
const DEFAULT_RUNNER_UP_PERCENTAGE = 30;
const DEFAULT_THIRD_PLACE_PERCENTAGE = 0;
type FlowStep = 0 | 1;

interface FinancialPreview {
  totalCollected: number;
  organizerAmount: number;
  prizePool: number;
  championAmount: number;
  runnerUpAmount: number;
  thirdPlaceAmount: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseEntryFee(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  let normalized = trimmed.replace(/[^0-9,.-]/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return roundCurrency(parsed);
}

function parsePercentage(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function calculatePreview(input: {
  entryFee: number;
  playerCount: number;
  organizerPercentage: number;
  championPercentage: number;
  runnerUpPercentage: number;
  thirdPlacePercentage: number;
}): FinancialPreview {
  const totalCollected = roundCurrency(input.entryFee * Math.max(0, input.playerCount));
  const organizerAmount = roundCurrency(totalCollected * (input.organizerPercentage / 100));
  const prizePool = roundCurrency(totalCollected - organizerAmount);

  return {
    totalCollected,
    organizerAmount,
    prizePool,
    championAmount: roundCurrency(prizePool * (input.championPercentage / 100)),
    runnerUpAmount: roundCurrency(prizePool * (input.runnerUpPercentage / 100)),
    thirdPlaceAmount: roundCurrency(prizePool * (input.thirdPlacePercentage / 100)),
  };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>(0);
  const [data, setData] = useState<OnboardingData>({
    tournamentName: '',
    playerNames: [],
    entryFee: '',
    organizerPercentage: String(DEFAULT_ORGANIZER_PERCENTAGE),
    championPercentage: String(DEFAULT_CHAMPION_PERCENTAGE),
    runnerUpPercentage: String(DEFAULT_RUNNER_UP_PERCENTAGE),
    thirdPlacePercentage: String(DEFAULT_THIRD_PLACE_PERCENTAGE),
    thirdPlaceEnabled: false,
  });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawArmed, setIsDrawArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniquePlayers = useMemo(
    () =>
      data.playerNames.filter(
        (name, index, list) =>
          list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) ===
          index
      ),
    [data.playerNames]
  );

  const entryFeeValue = parseEntryFee(data.entryFee);
  const organizerPercentageValue = parsePercentage(data.organizerPercentage);
  const championPercentageValue = parsePercentage(data.championPercentage);
  const runnerUpPercentageValue = parsePercentage(data.runnerUpPercentage);
  const thirdPlacePercentageValue = data.thirdPlaceEnabled
    ? parsePercentage(data.thirdPlacePercentage)
    : 0;

  const percentageSum =
    (championPercentageValue ?? 0) +
    (runnerUpPercentageValue ?? 0) +
    (typeof thirdPlacePercentageValue === 'number' ? thirdPlacePercentageValue : 0);

  const percentageSumValid = Math.abs(percentageSum - 100) < 0.01;

  const prizeValidationMessages: string[] = [];
  if (organizerPercentageValue == null) {
    prizeValidationMessages.push('Defina um percentual válido para o organizador (0 a 100).');
  }
  if (championPercentageValue == null) {
    prizeValidationMessages.push('Defina um percentual válido para o campeão (0 a 100).');
  }
  if (runnerUpPercentageValue == null) {
    prizeValidationMessages.push('Defina um percentual válido para o vice (0 a 100).');
  }
  if (data.thirdPlaceEnabled && thirdPlacePercentageValue == null) {
    prizeValidationMessages.push('Defina um percentual válido para o 3º lugar (0 a 100).');
  }
  if (
    championPercentageValue != null &&
    runnerUpPercentageValue != null &&
    thirdPlacePercentageValue != null &&
    !percentageSumValid
  ) {
    prizeValidationMessages.push(
      `A soma da premiação está em ${percentageSum.toFixed(2)}%. Ela precisa fechar em 100%.`
    );
  }

  const isPrizeConfigValid =
    organizerPercentageValue != null &&
    championPercentageValue != null &&
    runnerUpPercentageValue != null &&
    thirdPlacePercentageValue != null &&
    percentageSumValid;

  const preview = calculatePreview({
    entryFee: entryFeeValue ?? 0,
    playerCount: uniquePlayers.length,
    organizerPercentage: organizerPercentageValue ?? 0,
    championPercentage: championPercentageValue ?? 0,
    runnerUpPercentage: runnerUpPercentageValue ?? 0,
    thirdPlacePercentage: thirdPlacePercentageValue ?? 0,
  });

  const canContinue =
    data.tournamentName.trim().length > 0 &&
    entryFeeValue !== null &&
    isPrizeConfigValid;

  const canDraw = uniquePlayers.length >= MIN_PLAYERS && canContinue;

  useEffect(() => {
    if (!REQUIRE_DOUBLE_TAP_CONFIRM) return;
    if (!isDrawArmed) return;
    const timeout = setTimeout(() => setIsDrawArmed(false), 5000);
    return () => clearTimeout(timeout);
  }, [isDrawArmed]);

  useEffect(() => {
    if (!REQUIRE_DOUBLE_TAP_CONFIRM) return;
    setIsDrawArmed(false);
  }, [uniquePlayers.length]);

  const addPlayer = () => {
    const normalized = playerInput.trim().replace(/\s+/g, ' ');
    if (!normalized) return;
    const exists = uniquePlayers.some(
      (item) => item.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) {
      setPlayerInput('');
      return;
    }

    setData((previous) => ({
      ...previous,
      playerNames: [...previous.playerNames, normalized],
    }));
    setPlayerInput('');
    setError(null);
  };

  const removePlayer = (name: string) => {
    setData((previous) => ({
      ...previous,
      playerNames: previous.playerNames.filter((item) => item !== name),
    }));
    setError(null);
  };

  const submitDraw = async () => {
    if (!canDraw) return;

    const safeEntryFee = entryFeeValue ?? 0;
    const safeOrganizerPercentage = organizerPercentageValue ?? DEFAULT_ORGANIZER_PERCENTAGE;
    const safeChampionPercentage = championPercentageValue ?? DEFAULT_CHAMPION_PERCENTAGE;
    const safeRunnerUpPercentage = runnerUpPercentageValue ?? DEFAULT_RUNNER_UP_PERCENTAGE;
    const safeThirdPlacePercentage =
      thirdPlacePercentageValue ?? DEFAULT_THIRD_PLACE_PERCENTAGE;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch('/onboarding/setup', {
        method: 'POST',
        body: JSON.stringify({
          tournamentName: data.tournamentName.trim(),
          playerNames: uniquePlayers,
          entryFee: safeEntryFee,
          organizerPercentage: safeOrganizerPercentage,
          championPercentage: safeChampionPercentage,
          runnerUpPercentage: safeRunnerUpPercentage,
          thirdPlacePercentage: safeThirdPlacePercentage,
          firstPlacePercentage: safeChampionPercentage,
          secondPlacePercentage: safeRunnerUpPercentage,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${response.status}`
        );
      }

      const result: OnboardingResult = await response.json();
      navigate(`/app/tournament/${result.tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setIsDrawArmed(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrawPress = () => {
    if (!canDraw || isSubmitting) return;
    if (REQUIRE_DOUBLE_TAP_CONFIRM && !isDrawArmed) {
      setIsDrawArmed(true);
      return;
    }
    submitDraw();
  };

  const drawButtonText = isSubmitting
    ? 'Sorteando...'
    : REQUIRE_DOUBLE_TAP_CONFIRM && canDraw && isDrawArmed
      ? 'Confirmar sorteio'
      : `Sortear (${uniquePlayers.length} jogador${uniquePlayers.length === 1 ? '' : 'es'})`;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl flex-col justify-center">
      <div className="mb-6">
        <h1 className="mb-2 font-display text-3xl text-white">Criar torneio</h1>
        <p className="text-base text-gray-300">
          Fluxo rápido para configurar premiação e iniciar pelo celular.
        </p>
      </div>

      <div className="w-full rounded-3xl border border-gray-800 bg-gray-900/80 p-4 sm:p-6">
        <div className="mb-8 grid grid-cols-2 gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label}>
              <div
                className={[
                  'h-2 rounded-full transition-colors',
                  i <= step ? 'bg-emerald-500' : 'bg-gray-700',
                ].join(' ')}
              />
              <p
                className={[
                  'mt-2 text-center text-sm transition-colors',
                  i <= step ? 'text-gray-200' : 'text-gray-500',
                ].join(' ')}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {step === 0 && (
          <section>
            <h2 className="mb-2 text-2xl font-bold text-white">Dados e premiação</h2>
            <p className="mb-5 text-base text-gray-300">
              Configure o torneio. O modo simples já vem pronto.
            </p>

            <label htmlFor="tournament-name" className="sr-only">
              Nome do torneio
            </label>
            <input
              id="tournament-name"
              name="tournamentName"
              type="text"
              value={data.tournamentName}
              autoComplete="off"
              onChange={(event) =>
                setData((previous) => ({
                  ...previous,
                  tournamentName: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canContinue) {
                  setStep(1);
                }
              }}
              placeholder="Ex: Copa de Domingo"
              className="mb-4 h-14 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-lg text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
            />

            <label htmlFor="entry-fee" className="sr-only">
              Taxa por jogador
            </label>
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                R$
              </span>
              <input
                id="entry-fee"
                name="entryFee"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={data.entryFee}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    entryFee: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canContinue) {
                    setStep(1);
                  }
                }}
                placeholder="0,00"
                className="h-14 w-full rounded-2xl border border-gray-700 bg-gray-950 pl-14 pr-4 text-lg text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {entryFeeValue === null && (
              <p className="mb-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-base text-red-200">
                Digite uma taxa válida (ex: 25 ou 25,00).
              </p>
            )}

            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Modo simples: organizador {DEFAULT_ORGANIZER_PERCENTAGE}% | campeão {DEFAULT_CHAMPION_PERCENTAGE}% | vice {DEFAULT_RUNNER_UP_PERCENTAGE}%
            </div>

            <button
              type="button"
              onClick={() => setIsAdvancedOpen((current) => !current)}
              className="mb-3 flex h-12 w-full items-center justify-center rounded-xl border border-gray-700 bg-gray-800 px-4 text-base font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/60 [touch-action:manipulation]"
            >
              ⚙️ Configurar regras de premiação
            </button>

            {isAdvancedOpen && (
              <div className="mb-4 space-y-3 rounded-2xl border border-gray-700 bg-gray-950/70 p-4">
                <PercentageInput
                  id="organizer-percentage"
                  label="Percentual do organizador"
                  value={data.organizerPercentage}
                  onChange={(value) =>
                    setData((previous) => ({ ...previous, organizerPercentage: value }))
                  }
                />

                <PercentageInput
                  id="champion-percentage"
                  label="Percentual do campeão"
                  value={data.championPercentage}
                  onChange={(value) =>
                    setData((previous) => ({ ...previous, championPercentage: value }))
                  }
                />

                <PercentageInput
                  id="runner-up-percentage"
                  label="Percentual do vice"
                  value={data.runnerUpPercentage}
                  onChange={(value) =>
                    setData((previous) => ({ ...previous, runnerUpPercentage: value }))
                  }
                />

                <label className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm text-gray-100">
                  <input
                    type="checkbox"
                    checked={data.thirdPlaceEnabled}
                    onChange={(event) =>
                      setData((previous) => ({
                        ...previous,
                        thirdPlaceEnabled: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-emerald-500"
                  />
                  Incluir premiação para 3º lugar
                </label>

                {data.thirdPlaceEnabled && (
                  <PercentageInput
                    id="third-place-percentage"
                    label="Percentual do 3º lugar"
                    value={data.thirdPlacePercentage}
                    onChange={(value) =>
                      setData((previous) => ({ ...previous, thirdPlacePercentage: value }))
                    }
                  />
                )}
              </div>
            )}

            {prizeValidationMessages.length > 0 && (
              <div className="mb-4 space-y-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3">
                {prizeValidationMessages.map((message) => (
                  <p key={message} className="text-sm text-red-200">
                    {message}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => setStep(1)}
                disabled={!canContinue}
                className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-gray-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 [touch-action:manipulation]"
              >
                Continuar
              </button>
              <Link
                to="/app/tournaments"
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-800 text-lg font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/60 [touch-action:manipulation]"
              >
                Voltar
              </Link>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="pb-28">
            <h2 className="mb-2 text-2xl font-bold text-white">Jogadores</h2>
            <p className="mb-5 text-base text-gray-300">
              Adicione um nome por vez e pressione Enter.
            </p>

            <div className="mb-4 flex gap-2">
              <label htmlFor="player-name" className="sr-only">
                Nome do jogador
              </label>
              <input
                id="player-name"
                name="playerName"
                type="text"
                value={playerInput}
                autoComplete="off"
                onChange={(event) => setPlayerInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addPlayer();
                  }
                }}
                placeholder="Nome do jogador"
                className="h-14 flex-1 rounded-2xl border border-gray-700 bg-gray-950 px-4 text-lg text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
              />
              <button
                onClick={addPlayer}
                disabled={!playerInput.trim()}
                className="h-14 min-w-14 rounded-2xl bg-gray-800 px-4 text-xl font-bold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/60 disabled:cursor-not-allowed disabled:text-gray-500 [touch-action:manipulation]"
                aria-label="Adicionar jogador"
              >
                +
              </button>
            </div>

            <p className="mb-3 text-base font-medium text-gray-200">
              Total: {uniquePlayers.length} jogador{uniquePlayers.length === 1 ? '' : 'es'}
            </p>

            <FinancialPreviewCard
              preview={preview}
              thirdPlaceEnabled={data.thirdPlaceEnabled}
            />

            <ul className="mb-5 max-h-64 space-y-2 overflow-auto pr-1">
              {uniquePlayers.map((name) => (
                <li
                  key={name}
                  className="flex min-h-12 items-center justify-between rounded-xl border border-gray-700 bg-gray-950 px-4"
                >
                  <span className="text-base text-white">{name}</span>
                  <button
                    onClick={() => removePlayer(name)}
                    className="rounded-lg px-3 py-1.5 text-base font-semibold text-red-300 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300/50 [touch-action:manipulation]"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            {error && (
              <p
                aria-live="polite"
                className="mb-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-base text-red-200"
              >
                {error}
              </p>
            )}

            {!isPrizeConfigValid && (
              <p className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                Revise as regras de premiação na etapa anterior para continuar.
              </p>
            )}

            <button
              onClick={() => setStep(0)}
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/60 disabled:cursor-not-allowed disabled:text-gray-500 [touch-action:manipulation]"
            >
              Voltar
            </button>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-[#0b1120]/95 backdrop-blur-md">
              <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-3 sm:px-6">
                {!canDraw && (
                  <p className="mb-2 text-sm text-amber-200">
                    Adicione pelo menos {MIN_PLAYERS} jogadores com regras válidas para sortear.
                  </p>
                )}
                {REQUIRE_DOUBLE_TAP_CONFIRM && canDraw && isDrawArmed && !isSubmitting && (
                  <p className="mb-2 text-sm text-emerald-200">
                    Toque novamente para confirmar o sorteio.
                  </p>
                )}
                <button
                  onClick={handleDrawPress}
                  disabled={!canDraw || isSubmitting}
                  className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-gray-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
                >
                  {drawButtonText}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PercentageInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-gray-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 pr-12 text-lg text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-gray-400">
          %
        </span>
      </div>
    </div>
  );
}

function FinancialPreviewCard({
  preview,
  thirdPlaceEnabled,
}: {
  preview: FinancialPreview;
  thirdPlaceEnabled: boolean;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
      <h3 className="mb-3 text-base font-semibold text-emerald-100">Prévia financeira</h3>
      <div className="space-y-2 text-sm text-emerald-50">
        <PreviewLine label="Total arrecadado" value={formatCurrency(preview.totalCollected)} />
        <PreviewLine label="Valor do organizador" value={formatCurrency(preview.organizerAmount)} />
        <PreviewLine label="Total da premiação" value={formatCurrency(preview.prizePool)} />
        <PreviewLine label="Valor do campeão" value={formatCurrency(preview.championAmount)} />
        <PreviewLine label="Valor do vice" value={formatCurrency(preview.runnerUpAmount)} />
        {thirdPlaceEnabled && (
          <PreviewLine label="Valor do terceiro" value={formatCurrency(preview.thirdPlaceAmount)} />
        )}
      </div>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-emerald-100/85">{label}</span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}
