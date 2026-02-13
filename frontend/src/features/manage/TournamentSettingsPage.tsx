import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTournamentDetails } from './useTournamentDetails.ts';
import { useUpdateFinancials } from './useUpdateFinancials.ts';

function formatCurrency(value: number): string {
  if (!isFinite(value)) return 'R$\u00a00,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: string): string {
  return value === '' ? '0' : value;
}

export function TournamentSettingsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error: loadError, isLoading, refetch } = useTournamentDetails(tournamentId!);
  const { updateFinancials, isSubmitting, error: submitError } = useUpdateFinancials();

  type FieldState = { value: string; sourceId: string | null };

  const [entryFeeState, setEntryFeeState] = useState<FieldState>({
    value: '',
    sourceId: null,
  });
  const [organizerPctState, setOrganizerPctState] = useState<FieldState>({
    value: '',
    sourceId: null,
  });
  const [firstPctState, setFirstPctState] = useState<FieldState>({
    value: '70',
    sourceId: null,
  });
  const [secondPctState, setSecondPctState] = useState<FieldState>({
    value: '30',
    sourceId: null,
  });
  const [saved, setSaved] = useState(false);

  const tournamentKey = data?.id ?? null;
  const entryFeeValue = data?.entryFee;
  const organizerPercentageValue = data?.organizerPercentage;
  const firstPlacePercentageValue = data?.firstPlacePercentage;
  const secondPlacePercentageValue = data?.secondPlacePercentage;
  const hasDetails = data != null;

  const serverDefaults = useMemo(() => {
    if (!hasDetails || !tournamentKey) return null;
    return {
      entryFee: entryFeeValue != null ? String(entryFeeValue) : '',
      organizerPercentage:
        organizerPercentageValue != null ? String(organizerPercentageValue) : '',
      firstPlacePercentage:
        firstPlacePercentageValue != null ? String(firstPlacePercentageValue) : '70',
      secondPlacePercentage:
        secondPlacePercentageValue != null ? String(secondPlacePercentageValue) : '30',
    };
  }, [
    hasDetails,
    tournamentKey,
    entryFeeValue,
    organizerPercentageValue,
    firstPlacePercentageValue,
    secondPlacePercentageValue,
  ]);

  const entryFee =
    entryFeeState.sourceId === tournamentKey
      ? entryFeeState.value
      : serverDefaults?.entryFee ?? '';
  const organizerPct =
    organizerPctState.sourceId === tournamentKey
      ? organizerPctState.value
      : serverDefaults?.organizerPercentage ?? '';
  const firstPct =
    firstPctState.sourceId === tournamentKey
      ? firstPctState.value
      : serverDefaults?.firstPlacePercentage ?? '70';
  const secondPct =
    secondPctState.sourceId === tournamentKey
      ? secondPctState.value
      : serverDefaults?.secondPlacePercentage ?? '30';

  const handleEntryFeeChange = (value: string) => {
    setEntryFeeState({ value, sourceId: tournamentKey });
    setSaved(false);
  };

  const handleOrganizerPctChange = (value: string) => {
    setOrganizerPctState({ value, sourceId: tournamentKey });
    setSaved(false);
  };

  const handleFirstPctChange = (value: string) => {
    setFirstPctState({ value, sourceId: tournamentKey });
    setSaved(false);

    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      const remaining = Math.max(100 - num, 0);
      setSecondPctState({
        value: String(Math.round(remaining * 100) / 100),
        sourceId: tournamentKey,
      });
    }
  };

  const handleSecondPctChange = (value: string) => {
    setSecondPctState({ value, sourceId: tournamentKey });
    setSaved(false);
  };

  const resetFieldOverrides = () => {
    setEntryFeeState({ value: '', sourceId: null });
    setOrganizerPctState({ value: '', sourceId: null });
    setFirstPctState({ value: '70', sourceId: null });
    setSecondPctState({ value: '30', sourceId: null });
  };

  const playerCount = data?.playerCount ?? 0;

  const preview = useMemo(() => {
    const fee = parseFloat(entryFee) || 0;
    const orgPct = parseFloat(organizerPct) || 0;
    const fp = parseFloat(firstPct) || 0;
    const sp = parseFloat(secondPct) || 0;

    const totalCollected = fee * playerCount;
    const organizerAmount = totalCollected * (orgPct / 100);
    const prizePool = Math.max(totalCollected - organizerAmount, 0);
    const firstPlace = prizePool * (fp / 100);
    const secondPlace = prizePool * (sp / 100);

    return { totalCollected, organizerAmount, prizePool, firstPlace, secondPlace };
  }, [entryFee, organizerPct, firstPct, secondPct, playerCount]);

  const savedSnapshot = useMemo(() => {
    if (!data || data.totalCollected == null) return null;
    return {
      totalCollected: data.totalCollected,
      organizerAmount:
        data.organizerAmount ??
        Math.max((data.totalCollected ?? 0) - (data.prizePool ?? 0), 0),
      prizePool: data.prizePool ?? 0,
      firstPlace: data.firstPlacePrize ?? 0,
      secondPlace: data.secondPlacePrize ?? 0,
    };
  }, [data]);

  const organizerNumber = parseFloat(organizerPct);
  const firstNumber = parseFloat(firstPct);
  const secondNumber = parseFloat(secondPct);
  const pctSum = (firstNumber || 0) + (secondNumber || 0);
  const pctValid = Math.abs(pctSum - 100) < 0.01;
  const organizerValid =
    organizerPct === '' || (organizerNumber >= 0 && organizerNumber <= 100);
  const firstValid = firstPct === '' || (firstNumber >= 0 && firstNumber <= 100);
  const secondValid = secondPct === '' || (secondNumber >= 0 && secondNumber <= 100);

  const validationMessages: string[] = [];
  if (!pctValid && firstPct !== '' && secondPct !== '') {
    validationMessages.push(
      `Os percentuais somam ${pctSum.toFixed(1)}%. Eles precisam totalizar 100%.`
    );
  }
  if (!organizerValid) {
    validationMessages.push('O percentual do organizador deve ficar entre 0% e 100%.');
  }
  if (!firstValid) {
    validationMessages.push('O percentual de 1º lugar deve ficar entre 0% e 100%.');
  }
  if (!secondValid) {
    validationMessages.push('O percentual de 2º lugar deve ficar entre 0% e 100%.');
  }

  const canSave =
    entryFee !== '' &&
    organizerPct !== '' &&
    firstPct !== '' &&
    secondPct !== '' &&
    validationMessages.length === 0 &&
    data?.status !== 'FINISHED' &&
    !isSubmitting;

  async function handleSave() {
    if (!data || data.status === 'FINISHED' || !canSave) return;
    setSaved(false);
    try {
      await updateFinancials(tournamentId!, {
        entryFee: parseFloat(entryFee),
        organizerPercentage: parseFloat(organizerPct),
        firstPlacePercentage: parseFloat(firstPct),
        secondPlacePercentage: parseFloat(secondPct),
      });
      setSaved(true);
      await refetch();
      resetFieldOverrides();
    } catch {
      // handled upstream
    }
  }

  if (isLoading) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">Carregando...</p>
    );
  }

  if (loadError && !data) {
    return (
      <p className="text-red-400 text-center py-12">{loadError}</p>
    );
  }

  if (!data) return null;

  const isTournamentFinished = data.status === 'FINISHED';

  return (
    <div className="max-w-5xl animate-[fadeIn_0.4s_ease-out]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex items-center gap-3 mb-8">
        <Link
          to={`/app/tournament/${tournamentId}`}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400/70 mb-1">
            Finance Suite
          </p>
          <h1 className="font-display text-4xl text-white tracking-tight">
            {data.name}
          </h1>
          <p className="text-gray-500 text-sm">Configuracoes financeiras do torneio</p>
        </div>
      </div>

      {isTournamentFinished && (
        <p className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Torneio finalizado. Configurações de premiação estão bloqueadas.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* Form panel */}
        <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#020617] p-6 lg:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-10 w-48 h-48 bg-emerald-500/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-8 w-44 h-44 bg-amber-500/10 blur-3xl" />
          </div>
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
              Parametros
            </p>
            <h2 className="text-2xl text-white font-semibold mt-2">
              Ajuste as regras de cobrança
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {playerCount} jogador{playerCount === 1 ? '' : 'es'} inscritos
            </p>
          </div>

          <fieldset
            disabled={isTournamentFinished}
            className="relative mt-8 space-y-6 disabled:opacity-60"
          >
            <fieldset className="space-y-3">
              <legend className="text-sm text-gray-300 uppercase tracking-widest font-semibold">
                Receita
              </legend>
              <label className="block text-sm text-gray-400 mb-1">
                Taxa de inscricao
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500/60 transition">
                <span className="text-gray-500 text-xs font-semibold tracking-[0.4em] uppercase">
                  BRL
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryFee}
                  onChange={(e) => handleEntryFeeChange(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-white text-lg font-semibold focus:outline-none"
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm text-gray-300 uppercase tracking-widest font-semibold">
                Corte do organizador
              </legend>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500/60 transition">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={organizerPct}
                  onChange={(e) => handleOrganizerPctChange(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent text-white text-lg font-semibold focus:outline-none"
                />
                <span className="text-gray-500 text-xs font-semibold tracking-[0.4em] uppercase">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Este valor e deduzido antes da distribuicao dos premios.
              </p>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm text-gray-300 uppercase tracking-widest font-semibold">
                Divisao de premios
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500/60 transition">
                  <label className="block text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold mb-1">
                    1o lugar
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={firstPct}
                      onChange={(e) => handleFirstPctChange(e.target.value)}
                      className="flex-1 bg-transparent text-white text-lg font-semibold focus:outline-none"
                    />
                    <span className="text-gray-500 text-xs font-semibold tracking-[0.4em] uppercase">
                      %
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500/60 transition">
                  <label className="block text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold mb-1">
                    2o lugar
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={secondPct}
                      onChange={(e) => handleSecondPctChange(e.target.value)}
                      className="flex-1 bg-transparent text-white text-lg font-semibold focus:outline-none"
                    />
                    <span className="text-gray-500 text-xs font-semibold tracking-[0.4em] uppercase">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </fieldset>

            {validationMessages.length > 0 && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 space-y-1">
                {validationMessages.map((msg) => (
                  <p key={msg} className="text-xs text-red-300">
                    {msg}
                  </p>
                ))}
              </div>
            )}

            {submitError && (
              <p className="text-red-400 text-sm">{submitError}</p>
            )}
            {saved && (
              <p className="text-emerald-400 text-sm">Configuracoes salvas com sucesso!</p>
            )}

            <button
              onClick={handleSave}
              disabled={!canSave || isTournamentFinished}
              className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isTournamentFinished
                ? 'Torneio finalizado'
                : isSubmitting
                  ? 'Salvando...'
                  : 'Salvar configuracoes'}
            </button>
          </fieldset>
        </section>

        {/* Preview column */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-[#020817] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
                  Preview
                </p>
                <h3 className="text-xl text-white font-semibold">
                  Simulacao em tempo real
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Live
              </span>
            </div>

            <div className="space-y-4">
              <PreviewRow
                label="Total arrecadado"
                helper={`${playerCount} x ${formatCurrency(parseFloat(entryFee) || 0)}`}
                value={formatCurrency(preview.totalCollected)}
                accent="text-slate-50"
              />
              <PreviewRow
                label={`Organizador (${formatPercent(organizerPct)}%)`}
                value={`- ${formatCurrency(preview.organizerAmount)}`}
                accent="text-amber-300"
              />
              <hr className="border-white/5" />
              <PreviewRow
                label="Premiacao liquida"
                value={formatCurrency(preview.prizePool)}
                accent="text-emerald-300"
              />
              <div className="grid grid-cols-2 gap-3">
                <PreviewCard
                  label={`1º lugar (${formatPercent(firstPct)}%)`}
                  value={formatCurrency(preview.firstPlace)}
                  tone="amber"
                />
                <PreviewCard
                  label={`2º lugar (${formatPercent(secondPct)}%)`}
                  value={formatCurrency(preview.secondPlace)}
                  tone="slate"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#05060c] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
                  Valores atuais
                </p>
                <h3 className="text-lg text-white font-semibold">Configuracao aplicada</h3>
              </div>
              <span className="text-xs text-gray-500">
                Status: <span className="text-gray-300">{data.status}</span>
              </span>
            </div>
            {savedSnapshot ? (
              <dl className="space-y-3 text-sm">
                <SummaryRow label="Total arrecadado" value={formatCurrency(savedSnapshot.totalCollected)} />
                <SummaryRow label="Organizador" value={formatCurrency(savedSnapshot.organizerAmount)} />
                <SummaryRow label="Premiacao" value={formatCurrency(savedSnapshot.prizePool)} />
                <SummaryRow label="1º lugar" value={formatCurrency(savedSnapshot.firstPlace)} />
                <SummaryRow label="2º lugar" value={formatCurrency(savedSnapshot.secondPlace)} />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">
                Nenhuma configuracao aplicada ainda. Salve para gerar o resumo oficial.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  helper,
  value,
  accent,
}: {
  label: string;
  helper?: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
          {label}
        </p>
        {helper && <p className="text-[11px] text-gray-500 mt-1">{helper}</p>}
      </div>
      <p className={['text-lg font-semibold font-mono', accent ?? 'text-white'].join(' ')}>
        {value}
      </p>
    </div>
  );
}

function PreviewCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'slate';
}) {
  const toneStyles =
    tone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-100'
      : 'border-white/10 bg-white/5 text-gray-200';
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneStyles}`}>
      <p className="text-[11px] uppercase tracking-[0.4em] text-gray-500 font-semibold">
        {label}
      </p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-300">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
