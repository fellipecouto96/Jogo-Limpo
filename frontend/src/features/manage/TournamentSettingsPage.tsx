import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTournamentDetails } from './useTournamentDetails.ts';
import { useUpdateFinancials } from './useUpdateFinancials.ts';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function TournamentSettingsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error: loadError, isLoading, refetch } = useTournamentDetails(tournamentId!);
  const { updateFinancials, isSubmitting, error: submitError } = useUpdateFinancials();

  const [entryFee, setEntryFee] = useState('');
  const [organizerPct, setOrganizerPct] = useState('');
  const [firstPct, setFirstPct] = useState('70');
  const [secondPct, setSecondPct] = useState('30');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setEntryFee(data.entryFee != null ? String(data.entryFee) : '');
      setOrganizerPct(data.organizerPercentage != null ? String(data.organizerPercentage) : '');
      setFirstPct(data.firstPlacePercentage != null ? String(data.firstPlacePercentage) : '70');
      setSecondPct(data.secondPlacePercentage != null ? String(data.secondPlacePercentage) : '30');
    }
  }, [data]);

  const playerCount = data?.playerCount ?? 0;

  const preview = useMemo(() => {
    const fee = parseFloat(entryFee) || 0;
    const orgPct = parseFloat(organizerPct) || 0;
    const fp = parseFloat(firstPct) || 0;
    const sp = parseFloat(secondPct) || 0;

    const totalCollected = fee * playerCount;
    const organizerCut = totalCollected * (orgPct / 100);
    const netPrize = totalCollected - organizerCut;
    const firstPlace = netPrize * (fp / 100);
    const secondPlace = netPrize * (sp / 100);

    return { totalCollected, organizerCut, netPrize, firstPlace, secondPlace };
  }, [entryFee, organizerPct, firstPct, secondPct, playerCount]);

  const pctSum = (parseFloat(firstPct) || 0) + (parseFloat(secondPct) || 0);
  const pctValid = Math.abs(pctSum - 100) < 0.01;

  const canSave =
    entryFee !== '' &&
    organizerPct !== '' &&
    firstPct !== '' &&
    secondPct !== '' &&
    pctValid &&
    !isSubmitting;

  async function handleSave() {
    if (!canSave) return;
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
    } catch {
      // error handled by hook
    }
  }

  function handleFirstPctChange(value: string) {
    setFirstPct(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setSecondPct(String(Math.round((100 - num) * 100) / 100));
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

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/app/tournament/${tournamentId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-3xl text-white">{data.name}</h1>
          <p className="text-gray-400 text-sm">Configuracoes financeiras</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-5">Valores</h2>

        <div className="space-y-4">
          {/* Entry fee */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Taxa de inscricao
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm font-medium">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0,00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Organizer percentage */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Percentual do organizador
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={organizerPct}
                onChange={(e) => setOrganizerPct(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="text-gray-500 text-sm font-medium">%</span>
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* Prize split */}
          <p className="text-sm font-semibold text-gray-300">Divisao da premiacao</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                1o lugar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={firstPct}
                  onChange={(e) => handleFirstPctChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="text-gray-500 text-sm font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                2o lugar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={secondPct}
                  onChange={(e) => setSecondPct(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="text-gray-500 text-sm font-medium">%</span>
              </div>
            </div>
          </div>

          {!pctValid && firstPct !== '' && secondPct !== '' && (
            <p className="text-red-400 text-xs">
              Os percentuais de 1o e 2o lugar devem somar 100% (atual: {pctSum}%)
            </p>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Previsao</h2>
        <p className="text-xs text-gray-500 mb-4">
          {playerCount} jogadores inscritos
        </p>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total arrecadado</span>
            <span className="text-white font-medium">
              {formatCurrency(preview.totalCollected)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Organizador ({organizerPct || '0'}%)</span>
            <span className="text-amber-400 font-medium">
              - {formatCurrency(preview.organizerCut)}
            </span>
          </div>
          <hr className="border-gray-800" />
          <div className="flex justify-between">
            <span className="text-gray-300 font-semibold">Premiacao liquida</span>
            <span className="text-emerald-400 font-bold">
              {formatCurrency(preview.netPrize)}
            </span>
          </div>
          <hr className="border-gray-800" />
          <div className="flex justify-between">
            <span className="text-gray-400">1o lugar ({firstPct || '0'}%)</span>
            <span className="text-yellow-300 font-medium">
              {formatCurrency(preview.firstPlace)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">2o lugar ({secondPct || '0'}%)</span>
            <span className="text-gray-300 font-medium">
              {formatCurrency(preview.secondPlace)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {submitError && (
        <p className="text-red-400 text-sm mb-3">{submitError}</p>
      )}
      {saved && (
        <p className="text-emerald-400 text-sm mb-3">Configuracoes salvas com sucesso!</p>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full py-3 rounded-xl font-bold text-sm transition-colors bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Salvando...' : 'Salvar configuracoes'}
      </button>
    </div>
  );
}
