import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTournamentDetails } from './useTournamentDetails.ts';
import { useBracketData } from '../tv/useBracketData.ts';
import { BracketRound } from '../tv/components/BracketRound.tsx';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import type { BracketMatch } from '../tv/types.ts';
import { deriveRunnerUp, deriveThirdAndFourth, derivePodiumScoreRows } from './podium.ts';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { parseGuidedSystemErrorText } from '../../shared/systemErrors.ts';
import { HistoryPageSkeleton } from '../../shared/loading/LoadingSystem.tsx';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatShareDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function TournamentHistoryPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const {
    data: details,
    error: detailsError,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useTournamentDetails(tournamentId!);
  const {
    data: bracket,
    error: bracketError,
    isLoading: bracketLoading,
    refetch: refetchBracket,
  } = useBracketData(tournamentId!);

  const isLoading = detailsLoading || bracketLoading;
  const error = detailsError || bracketError;

  const finalMatch = useMemo<BracketMatch | null>(() => {
    if (!bracket || bracket.totalRounds === 0) return null;
    const finalRound = bracket.rounds[bracket.totalRounds - 1];
    return (
      finalRound?.matches.find((match) => match.positionInBracket === 1) ?? null
    );
  }, [bracket]);

  if (isLoading) {
    return <HistoryPageSkeleton />;
  }

  if (error && !details && !bracket) {
    return (
      <div className="py-12">
        <GuidedErrorCard
          error={parseGuidedSystemErrorText(error)}
          onRetry={async () => {
            await Promise.all([refetchDetails(), refetchBracket()]);
          }}
        />
      </div>
    );
  }

  if (!bracket) return null;

  const { tournament, rounds, totalRounds, champion: bracketChampion } = bracket;
  const runnerUpFromBracket = deriveRunnerUp(rounds, totalRounds);
  const champion =
    details?.champion ??
    (bracketChampion
      ? { id: bracketChampion.id, name: bracketChampion.name }
      : null);
  const runnerUp =
    details?.runnerUp ??
    (runnerUpFromBracket
      ? {
          id: runnerUpFromBracket.id,
          name: runnerUpFromBracket.name,
        }
      : null);
  const thirdAndFourth = deriveThirdAndFourth(rounds, totalRounds);
  const thirdPlace = thirdAndFourth.thirdPlace;
  const fourthPlace = thirdAndFourth.fourthPlace;
  const podiumScoreRows = derivePodiumScoreRows(rounds, totalRounds);

  const tournamentPublicSlug = details?.publicSlug ?? null;
  const shareUrl = tournamentPublicSlug
    ? `${window.location.origin}/tournament/${tournamentPublicSlug}`
    : `${window.location.origin}/tournament/${tournamentId}/tv`;

  function buildShareMessage(): string {
    const championName = champion?.name ?? 'Campeão';
    const runnerUpName = runnerUp?.name ?? 'Vice-campeão';
    const thirdPlaceName = thirdPlace?.name ?? null;
    const fourthPlaceName = fourthPlace?.name ?? null;
    const championAmount = details?.championPrize ?? details?.firstPlacePrize ?? null;
    const runnerUpAmount = details?.runnerUpPrize ?? details?.secondPlacePrize ?? null;
    const thirdPlaceAmount = details?.thirdPlacePrize ?? null;
    const fourthPlaceAmount = details?.fourthPlacePrize ?? null;
    const playerCount = details?.playerCount ?? null;
    const dateStr = formatShareDate(tournament.finishedAt ?? tournament.startedAt ?? null);

    const hasPrize = championAmount != null || runnerUpAmount != null;
    const lines: string[] = [
      `RESULTADO OFICIAL – ${tournament.name}`,
      '---',
      `Campeao: ${championName}`,
      `Vice-campeao: ${runnerUpName}`,
    ];
    if (thirdPlaceName) lines.push(`3o lugar: ${thirdPlaceName}`);
    if (fourthPlaceName) lines.push(`4o lugar: ${fourthPlaceName}`);
    if (hasPrize) {
      lines.push('');
      lines.push('Premiacao:');
      if (championAmount != null) lines.push(`1o – ${formatCurrency(championAmount)}`);
      if (runnerUpAmount != null) lines.push(`2o – ${formatCurrency(runnerUpAmount)}`);
      if (thirdPlaceAmount != null && thirdPlaceAmount > 0) lines.push(`3o – ${formatCurrency(thirdPlaceAmount)}`);
      if (fourthPlaceAmount != null && fourthPlaceAmount > 0) lines.push(`4o – ${formatCurrency(fourthPlaceAmount)}`);
    }
    lines.push('');
    const infoLine = [
      playerCount != null ? `${playerCount} jogadores` : null,
      dateStr,
    ].filter(Boolean).join(' · ');
    if (infoLine) lines.push(infoLine);
    lines.push('');
    lines.push(`Chave completa: ${shareUrl}`);
    return lines.join('\n');
  }

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(buildShareMessage())}`;

  return (
    <div className="animate-[fadeIn_0.4s_ease-out] space-y-8">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </Link>

      <header className="rounded-3xl border border-white/5 bg-gradient-to-r from-[#0b1120] via-[#111827] to-[#020617] p-6 lg:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300 font-semibold">
              Relatório oficial
            </p>
            <h1 className="font-display text-4xl text-white tracking-tight mt-2">
              {tournament.name}
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              {formatDateRange(tournament.startedAt, tournament.finishedAt)}
            </p>
          </div>
          <StatusBadge status={tournament.status as 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED'} />
        </div>
      </header>

      <section className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#020617] p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] px-6 text-base font-semibold text-white shadow-[0_4px_24px_rgba(37,211,102,0.25)] transition hover:bg-[#1ebe5a] hover:shadow-[0_4px_32px_rgba(37,211,102,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/50 [touch-action:manipulation]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Compartilhar no WhatsApp
        </a>
      </section>

      {/* Section 1 – Basic Info */}
      <SectionCard title="Informações básicas" subtitle="Visão geral do torneio" accent="amber">
        <div className="grid gap-4 min-[500px]:grid-cols-2 lg:grid-cols-4">
          <InfoStat label="Organizador" value={details?.organizerName ?? '—'} />
          <InfoStat label="Data" value={formatDateRange(tournament.startedAt, tournament.finishedAt)} />
          <InfoStat label="Jogadores" value={`${details?.playerCount ?? 0}`} />
          <InfoStat label="Status" value={tournament.status} />
        </div>
      </SectionCard>

      {/* Section 2 – Results */}
      <SectionCard title="Resultados" subtitle="Resumo esportivo e chave completa" accent="emerald">
        <div className="grid gap-4 lg:grid-cols-3">
          <ResultTile
            label="Campeão"
            value={champion?.name ?? '—'}
            highlight
            helper={details?.firstPlacePrize != null ? formatCurrency(details.firstPlacePrize) : undefined}
          />
          <ResultTile
            label="Vice-campeão"
            value={runnerUp?.name ?? '—'}
            helper={
              details?.secondPlacePrize != null
                ? formatCurrency(details.secondPlacePrize)
                : undefined
            }
          />
          {(details?.thirdPlacePrize ?? 0) > 0 && (
            <ResultTile
              label="3º lugar"
              value={thirdPlace?.name ?? '—'}
              helper={
                details?.thirdPlacePrize != null
                  ? formatCurrency(details.thirdPlacePrize)
                  : undefined
              }
            />
          )}
          {(details?.fourthPlacePrize ?? 0) > 0 && (
            <ResultTile
              label="4º lugar"
              value={fourthPlace?.name ?? '—'}
              helper={
                details?.fourthPlacePrize != null
                  ? formatCurrency(details.fourthPlacePrize)
                  : undefined
              }
            />
          )}
          <FinalMatchCard match={finalMatch} />
        </div>
        {podiumScoreRows.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold mb-3">
              Placares registrados
            </h3>
            <div className="space-y-2">
              {podiumScoreRows.map((row) => (
                <div key={`${row.label}-${row.matchup}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">{row.label}</p>
                  <p className="text-sm text-gray-200">{row.matchup}</p>
                  <p className="text-base font-semibold text-white">{row.score}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalRounds > 0 && (
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold mb-2">
              Chave completa (somente leitura)
            </h3>
            <div
              className="grid gap-4 items-center w-full overflow-x-auto pb-4 rounded-2xl bg-white/5 border border-white/10 p-4"
              style={{
                gridTemplateColumns: `repeat(${totalRounds}, minmax(220px, 1fr))`,
              }}
            >
              {rounds.map((round) => (
                <BracketRound
                  key={round.id}
                  round={round}
                  totalRounds={totalRounds}
                  isLastRound={round.roundNumber === totalRounds}
                />
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 3 – Financial Summary */}
      <SectionCard title="Resumo financeiro" subtitle="Distribuição oficial e transparência" accent="gold">
        <div className="grid gap-4 min-[500px]:grid-cols-2 lg:grid-cols-3">
          <InfoStat label="Taxa de inscrição" value={formatCurrency(details?.entryFee ?? 0)} />
          <InfoStat label="Total arrecadado" value={formatCurrency(details?.totalCollected ?? 0)} />
          <InfoStat
            label={`Organizador (${details?.organizerPercentage ?? 0}%)`}
            value={formatCurrency(details?.organizerAmount ?? 0)}
          />
          <InfoStat label="Premiação líquida" value={formatCurrency(details?.prizePool ?? 0)} />
          <InfoStat
            label={`1º lugar (${details?.firstPlacePercentage ?? 0}%)`}
            value={formatCurrency(details?.firstPlacePrize ?? 0)}
          />
          <InfoStat
            label={`2º lugar (${details?.secondPlacePercentage ?? 0}%)`}
            value={formatCurrency(details?.secondPlacePrize ?? 0)}
          />
          {(details?.thirdPlacePrize ?? 0) > 0 && (
            <InfoStat
              label={`3º lugar (${details?.thirdPlacePercentage ?? 0}%)`}
              value={formatCurrency(details?.thirdPlacePrize ?? 0)}
            />
          )}
          {(details?.fourthPlacePrize ?? 0) > 0 && (
            <InfoStat
              label={`4º lugar (${details?.fourthPlacePercentage ?? 0}%)`}
              value={formatCurrency(details?.fourthPlacePrize ?? 0)}
            />
          )}
        </div>
      </SectionCard>

      {/* Section 4 – Transparency */}
      <SectionCard title="Transparência" subtitle="Auditoria do sorteio" accent="slate">
        <div className="grid gap-4 min-[500px]:grid-cols-2">
          <KeyValue label="Seed utilizado" value={details?.drawSeed ?? '—'} />
          <KeyValue label="Gerado em" value={formatDateTime(details?.startedAt)} />
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  accent: 'amber' | 'emerald' | 'gold' | 'slate';
}) {
  const accentColors: Record<string, string> = {
    amber: 'from-amber-500/10 via-[#0b1120] to-[#05060c]',
    emerald: 'from-emerald-500/10 via-[#0b1120] to-[#05060c]',
    gold: 'from-[#fbbf24]/10 via-[#0b1120] to-[#05060c]',
    slate: 'from-[#94a3b8]/10 via-[#0b1120] to-[#05060c]',
  };
  return (
    <section className={`rounded-3xl border border-white/5 bg-gradient-to-br ${accentColors[accent]} p-6 lg:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]`}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">
          {title}
        </p>
        <p className="text-gray-300 mt-1 text-sm">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.4em] text-gray-500 font-semibold mb-2">
        {label}
      </p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ResultTile({
  label,
  value,
  helper,
  highlight,
}: {
  label: string;
  value: string;
  helper?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl border px-4 py-5',
        highlight
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-50 shadow-[0_15px_40px_rgba(16,185,129,0.25)]'
          : 'border-white/10 bg-white/5 text-gray-100',
      ].join(' ')}
    >
      <p className="text-[11px] uppercase tracking-[0.4em] opacity-70 font-semibold">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      {helper && <p className="text-sm text-white/80 mt-1">{helper}</p>}
    </div>
  );
}

function FinalMatchCard({ match }: { match: BracketMatch | null }) {
  const matchup = match
    ? `${match.player1.name} vs ${match.player2?.name ?? 'TBD'}`
    : 'Sem dados';
  const result = match?.winner
    ? `${match.winner.name} venceu`
    : 'Resultado não registrado';
  const hasScore = match?.player1Score !== null && match?.player2Score !== null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-gray-100">
      <p className="text-[11px] uppercase tracking-[0.4em] opacity-70 font-semibold">
        Final
      </p>
      <p className="text-lg font-semibold mt-2">{matchup}</p>
      <p className="text-sm text-gray-300 mt-1">{result}</p>
      {hasScore && (
        <>
          <p className="text-xs text-gray-500 mt-3">Placar final</p>
          <p className="text-xl font-semibold text-white">
            {`${match!.player1Score} × ${match!.player2Score}`}
          </p>
        </>
      )}
      {match?.finishedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Disputada em {formatDateTime(match.finishedAt)}
        </p>
      )}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.4em] text-gray-500 font-semibold">
        {label}
      </p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  const startText = start ? formatDateFull(start) : null;
  const endText = end ? formatDateFull(end) : null;
  if (startText && endText) {
    return `${startText} — ${endText}`;
  }
  return startText ?? endText ?? '—';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
