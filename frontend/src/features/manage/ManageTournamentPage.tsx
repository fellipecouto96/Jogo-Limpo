import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useManageBracket } from './useManageBracket.ts';
import { useRecordResult } from './useRecordResult.ts';
import { InteractiveMatchCard } from './components/InteractiveMatchCard.tsx';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { useTournamentDetails } from './useTournamentDetails.ts';
import type { BracketMatch, BracketPlayer, BracketRound } from '../tv/types.ts';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import { useOnboarding } from '../../shared/useOnboarding.ts';
import { OnboardingHint } from '../../shared/OnboardingHint.tsx';
import { useAuth } from '../auth/useAuth.ts';
import { TournamentQRModal } from './TournamentQRModal.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import {
  formatGuidedSystemError,
  parseGuidedSystemErrorText,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

interface OrderedMatch {
  match: BracketMatch;
  roundNumber: number;
  roundLabel: string;
}

interface UndoLastResultResponse {
  matchId: string;
}

export function ManageTournamentPage() {
  const { organizer } = useAuth();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error, isLoading, refetch } = useManageBracket(
    tournamentId!
  );
  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useTournamentDetails(tournamentId!);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isSeedOpen, setIsSeedOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [isEndingTournament, setIsEndingTournament] = useState(false);
  const [isUndoingLastAction, setIsUndoingLastAction] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const [scrollFromMatch, setScrollFromMatch] = useState<{
    roundNumber: number;
    positionInBracket: number;
  } | null>(null);
  const [scrollToMatchId, setScrollToMatchId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, string>>({});
  const [updatingPlayerId, setUpdatingPlayerId] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isChampionshipCelebrating, setIsChampionshipCelebrating] = useState(false);
  const {
    isActive: onboardingActive,
    triggerToast,
    markComplete,
    isIdle,
    recordInteraction,
  } = useOnboarding();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousStatusRef = useRef<string | null>(null);
  const { recordResult, updateScore } = useRecordResult();
  const players = useMemo(
    () => extractTournamentPlayers(data?.rounds ?? []),
    [data?.rounds]
  );
  const tournamentStatus = data?.tournament.status ?? null;

  useEffect(() => {
    if (!isPlayersOpen) return;
    setPlayerDrafts(
      Object.fromEntries(players.map((player) => [player.id, player.name]))
    );
    setPlayerError(null);
  }, [isPlayersOpen, players]);

  useEffect(() => {
    if (!tournamentStatus) return;

    if (
      previousStatusRef.current === 'RUNNING' &&
      tournamentStatus === 'FINISHED'
    ) {
      setIsChampionshipCelebrating(true);
      triggerToast('toast-tournament-finished');
      markComplete();
    }
    if (tournamentStatus !== 'FINISHED') {
      setIsChampionshipCelebrating(false);
    }

    previousStatusRef.current = tournamentStatus;
  }, [tournamentStatus]);

  useEffect(() => {
    if (!isChampionshipCelebrating) return;
    const timeout = setTimeout(() => {
      setIsChampionshipCelebrating(false);
    }, 2200);
    return () => clearTimeout(timeout);
  }, [isChampionshipCelebrating]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, []);

  async function handleCopySeed() {
    const seed = details?.drawSeed;
    setActionError(null);
    setFeedback(null);

    if (!seed) {
      setActionError('Seed ainda não disponível para este torneio.');
      return;
    }

    try {
      await navigator.clipboard.writeText(seed);
      setFeedback('Seed copiada para a area de transferencia.');
    } catch {
      setActionError('Não foi possível copiar a seed.');
    }
  }

  async function handleShareResult() {
    const championName = details?.champion?.name ?? data?.champion?.name ?? 'Campeao';
    const runnerUpFallback = data
      ? deriveRunnerUp(data.rounds, data.totalRounds)?.name
      : null;
    const runnerUpName = details?.runnerUp?.name ?? runnerUpFallback ?? 'Vice-campeao';
    const championAmount = details?.championPrize ?? details?.firstPlacePrize ?? null;
    const runnerUpAmount = details?.runnerUpPrize ?? details?.secondPlacePrize ?? null;
    const thirdPlaceAmount = details?.thirdPlacePrize ?? null;
    const fourthPlaceAmount = details?.fourthPlacePrize ?? null;
    const shareUrl = `${window.location.origin}/tournament/${tournamentId}/tv`;
    const lines = [
      `Resultado oficial - ${data?.tournament.name ?? 'Torneio'}`,
      `Campeao: ${championName}`,
      `Vice: ${runnerUpName}`,
      championAmount != null ? `Premio do campeao: ${formatCurrency(championAmount)}` : null,
      runnerUpAmount != null ? `Premio do vice: ${formatCurrency(runnerUpAmount)}` : null,
      thirdPlaceAmount != null && thirdPlaceAmount > 0 ? `Premio do 3o lugar: ${formatCurrency(thirdPlaceAmount)}` : null,
      fourthPlaceAmount != null && fourthPlaceAmount > 0 ? `Premio do 4o lugar: ${formatCurrency(fourthPlaceAmount)}` : null,
      `Acompanhe: ${shareUrl}`,
    ].filter(Boolean) as string[];
    const message = lines.join('\n');

    setActionError(null);
    setFeedback(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Resultado - ${data?.tournament.name ?? 'Torneio'}`,
          text: message,
          url: shareUrl,
        });
        setFeedback('Resultado compartilhado com sucesso.');
        return;
      }

      await navigator.clipboard.writeText(message);
      setFeedback('Resultado copiado para compartilhamento.');
    } catch {
      setActionError('Não foi possível compartilhar o resultado.');
    }
  }

  async function handleRenamePlayer(player: BracketPlayer) {
    if (data?.tournament.status === 'FINISHED') {
      setPlayerError('Torneio finalizado. Edicao de jogadores bloqueada.');
      return;
    }

    const nextName = (playerDrafts[player.id] ?? '').trim();
    if (!nextName) {
      setPlayerError('Nome do jogador não pode ficar vazio.');
      return;
    }

    setUpdatingPlayerId(player.id);
    setPlayerError(null);
    setActionError(null);
    setFeedback(null);

    try {
      const response = await apiFetch(
        `/tournaments/${tournamentId}/players/${player.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: nextName }),
        }
      );
      if (!response.ok) {
        throw await buildHttpResponseError(response);
      }

      await Promise.all([refetch(), refetchDetails()]);
      setFeedback(`Jogador atualizado: ${nextName}`);
    } catch (err) {
      setPlayerError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setUpdatingPlayerId(null);
    }
  }

  async function handleFinishTournament() {
    if (data?.tournament.status === 'FINISHED') return;

    setIsEndingTournament(true);
    setActionError(null);
    setFeedback(null);

    try {
      const response = await apiFetch(`/tournaments/${tournamentId}/finish`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw await buildHttpResponseError(response);
      }

      await Promise.all([refetch(), refetchDetails()]);
      setFeedback('Torneio encerrado com sucesso.');
      setIsFinishOpen(false);
    } catch (err) {
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setIsEndingTournament(false);
    }
  }

  async function handleSelectWinner(
    entry: OrderedMatch,
    winnerId: string,
    winnerName: string,
    player1Score?: number,
    player2Score?: number
  ) {
    if (pendingMatchId || isUndoingLastAction) return;

    setPendingMatchId(entry.match.id);
    setActionError(null);
    setFeedback(null);
    try {
      await recordResult(tournamentId!, entry.match.id, winnerId, player1Score, player2Score);
      const scoreLabel = player1Score !== undefined && player2Score !== undefined
        ? ` (${player1Score} x ${player2Score})`
        : '';
      setLastActionLabel(`${winnerName} venceu${scoreLabel}`);
      setScrollFromMatch({
        roundNumber: entry.roundNumber,
        positionInBracket: entry.match.positionInBracket,
      });
      await Promise.all([refetch(), refetchDetails()]);
      triggerToast('toast-first-winner');
    } catch (err) {
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({
            error: err,
            context: 'draw',
          })
        )
      );
    } finally {
      setPendingMatchId(null);
    }
  }

  async function handleUpdateScore(matchId: string, player1Score: number, player2Score: number) {
    if (pendingMatchId || isUndoingLastAction) return;

    setPendingMatchId(matchId);
    setActionError(null);
    setFeedback(null);
    try {
      await updateScore(tournamentId!, matchId, player1Score, player2Score);
      setFeedback(`Placar atualizado: ${player1Score} x ${player2Score}`);
      await Promise.all([refetch(), refetchDetails()]);
    } catch (err) {
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setPendingMatchId(null);
    }
  }

  async function handleUndoLastAction() {
    if (!lastActionLabel || isUndoingLastAction || pendingMatchId) return;

    setIsUndoingLastAction(true);
    setActionError(null);
    setFeedback(null);
    try {
      const response = await apiFetch(
        `/tournaments/${tournamentId}/matches/undo-last`,
        { method: 'POST' }
      );
      if (!response.ok) {
        throw await buildHttpResponseError(response);
      }

      const payload = (await response.json()) as UndoLastResultResponse;
      setFeedback('Ultima partida desfeita.');
      setLastActionLabel(null);
      setScrollToMatchId(payload.matchId);
      await Promise.all([refetch(), refetchDetails()]);
    } catch (err) {
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setIsUndoingLastAction(false);
    }
  }

  useEffect(() => {
    if (!scrollFromMatch) return;

    const allMatches = getOrderedMatches(data?.rounds ?? []);
    const pending = allMatches.filter(
      ({ match }) => !match.isBye && match.player2 && !match.winner
    );
    const next =
      pending.find(
        ({ roundNumber, match }) =>
          roundNumber > scrollFromMatch.roundNumber ||
          (roundNumber === scrollFromMatch.roundNumber &&
            match.positionInBracket > scrollFromMatch.positionInBracket)
      ) ?? pending[0];

    if (next) {
      requestAnimationFrame(() => {
        matchRefs.current[next.match.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }
    setScrollFromMatch(null);
  }, [data, scrollFromMatch]);

  useEffect(() => {
    if (!scrollToMatchId) return;
    requestAnimationFrame(() => {
      matchRefs.current[scrollToMatchId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    setScrollToMatchId(null);
  }, [scrollToMatchId, data]);

  // Draw toast: fires once when a fresh tournament bracket loads
  const drawToastFiredRef = useRef(false);
  useEffect(() => {
    if (drawToastFiredRef.current) return;
    if (!data) return;
    const ordered = getOrderedMatches(data.rounds);
    const playable = ordered.filter(({ match }) => !match.isBye && match.player2 !== null);
    const completed = playable.filter(({ match }) => Boolean(match.winner));
    if (playable.length > 0 && completed.length === 0) {
      drawToastFiredRef.current = true;
      triggerToast('toast-first-draw');
    }
  }, [data, triggerToast]);

  if (isLoading) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">
        Carregando...
      </p>
    );
  }

  if (error && !data) {
    const guidedError = parseGuidedSystemErrorText(error);
    return (
      <div className="py-12">
        <GuidedErrorCard error={guidedError} onRetry={refetch} />
      </div>
    );
  }

  if (!data) return null;

  const { tournament, rounds, totalRounds, champion: bracketChampion } = data;
  const orderedMatches = getOrderedMatches(rounds);
  const playableMatches = orderedMatches.filter(
    ({ match }) => !match.isBye && match.player2 !== null
  );
  const activeMatches = playableMatches.filter(({ match }) => !match.winner);
  const completedMatches = playableMatches.filter(({ match }) => Boolean(match.winner));
  const completedCount = completedMatches.length;
  const totalCount = playableMatches.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const runnerUpFromBracket = deriveRunnerUp(rounds, totalRounds);
  const champion = details?.champion ?? bracketChampion;
  const runnerUp = details?.runnerUp ?? runnerUpFromBracket;

  return (
    <div onPointerDown={onboardingActive ? recordInteraction : undefined}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl text-white">
            {tournament.name}
          </h1>
          <StatusBadge status={tournament.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/tournament/${tournamentId}/tv`}
            className="flex h-11 items-center justify-center rounded-xl bg-gray-800 px-4 text-sm font-semibold text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Modo TV
          </Link>
          <Link
            to={`/tournament/${tournamentId}/mobile`}
            className="flex h-11 items-center justify-center rounded-xl bg-gray-800 px-4 text-sm font-semibold text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Celular
          </Link>
          {organizer?.publicSlug && (
            <button
              type="button"
              onClick={() => setIsQROpen(true)}
              className="flex h-11 items-center justify-center rounded-xl bg-gray-800 px-3 text-sm font-semibold text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors [touch-action:manipulation]"
              title="QR Code do torneio"
            >
              <QRIcon />
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label="Abrir configurações avançadas"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-gray-100 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 [touch-action:manipulation]"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v2.5" />
                <path d="M12 18.5V21" />
                <path d="M4.93 4.93l1.77 1.77" />
                <path d="M17.3 17.3l1.77 1.77" />
                <path d="M3 12h2.5" />
                <path d="M18.5 12H21" />
                <path d="M4.93 19.07l1.77-1.77" />
                <path d="M17.3 6.7l1.77-1.77" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-gray-700 bg-[#0b1120] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
              >
                {tournament.status === 'FINISHED' ? (
                  <div className="mb-1 flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-gray-500">
                    Ajustar premiação (bloqueado)
                  </div>
                ) : (
                  <Link
                    to={`/app/tournament/${tournamentId}/settings`}
                    onClick={() => setIsMenuOpen(false)}
                    className="mb-1 flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40"
                  >
                    Ajustar premiação
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsPlayersOpen(true);
                    setIsMenuOpen(false);
                  }}
                  disabled={tournament.status === 'FINISHED'}
                  className="mb-1 flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40 disabled:cursor-not-allowed disabled:text-gray-500 [touch-action:manipulation]"
                >
                  {tournament.status === 'FINISHED'
                    ? 'Editar jogadores (bloqueado)'
                    : 'Editar jogadores'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSeedOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="mb-1 flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40 [touch-action:manipulation]"
                >
                  Ver seed do sorteio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFinishOpen(true);
                    setIsMenuOpen(false);
                  }}
                  disabled={tournament.status === 'FINISHED'}
                  className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300/40 disabled:cursor-not-allowed disabled:text-gray-500 [touch-action:manipulation]"
                >
                  Encerrar torneio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <p className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {feedback}
        </p>
      )}
      {actionError && (
        <GuidedErrorCard
          error={parseGuidedSystemErrorText(actionError)}
          className="mb-4"
        />
      )}
      {tournament.status === 'FINISHED' && (
        <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Torneio finalizado. Partidas e edições estão bloqueadas.
        </p>
      )}

      {/* Winners panel */}
      {tournament.status === 'FINISHED' && (
        <div className="mb-6">
          <ChampionshipClosureScreen
            isLoading={detailsLoading && !details}
            tournamentName={tournament.name}
            finishedAt={details?.finishedAt ?? tournament.finishedAt ?? null}
            champion={champion}
            runnerUp={runnerUp}
            totalCollected={details?.totalCollected ?? null}
            organizerAmount={
              details?.organizerAmount ?? details?.calculatedOrganizerAmount ?? null
            }
            totalPrize={details?.prizePool ?? details?.calculatedPrizePool ?? null}
            championPrize={details?.championPrize ?? details?.firstPlacePrize ?? null}
            runnerUpPrize={details?.runnerUpPrize ?? details?.secondPlacePrize ?? null}
            thirdPlacePrize={details?.thirdPlacePrize ?? null}
            fourthPlacePrize={details?.fourthPlacePrize ?? null}
            tournamentId={tournamentId!}
            isCelebrating={isChampionshipCelebrating}
            onShare={handleShareResult}
            error={detailsError ?? null}
          />
        </div>
      )}

      {/* Live operation */}
      {totalRounds > 0 && (
        <section className="space-y-4 pb-32">
          {onboardingActive && activeMatches.length > 0 && (
            <OnboardingHint id="hint-match" message="Toque no vencedor para avançar." />
          )}
          {onboardingActive && isIdle && activeMatches.length > 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-200">
              Selecione o jogador que venceu a partida para registrar o resultado.
            </div>
          )}
          <div className="rounded-2xl border border-gray-800 bg-[#0b1120] p-4">
            <p className="mb-3 text-sm font-semibold text-gray-200">
              {completedCount} de {totalCount} partidas concluídas
            </p>
            <div className="h-3 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {rounds.map((round) => {
            const matches = [...round.matches].sort(
              (a, b) => a.positionInBracket - b.positionInBracket
            );

            return (
              <div key={round.id} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {round.label}
                </h2>
                {matches.length === 0 ? (
                  <p className="rounded-xl border border-gray-800 bg-[#0b1120] px-4 py-3 text-sm text-gray-400">
                    Aguardando conclusão da rodada anterior.
                  </p>
                ) : (
                  matches.map((match) => {
                    const entry: OrderedMatch = {
                      match,
                      roundNumber: round.roundNumber,
                      roundLabel: round.label,
                    };

                    return (
                      <div
                        key={match.id}
                        ref={(node) => {
                          matchRefs.current[match.id] = node;
                        }}
                      >
                        <InteractiveMatchCard
                          match={match}
                          roundLabel={round.label}
                          tournamentStatus={tournament.status}
                          isBusy={pendingMatchId !== null || isUndoingLastAction}
                          onSelectWinner={(winnerId, winnerName, score1, score2) =>
                            handleSelectWinner(entry, winnerId, winnerName, score1, score2)
                          }
                          onUpdateScore={handleUpdateScore}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}

          {activeMatches.length === 0 && tournament.status === 'RUNNING' && (
            <p className="rounded-xl border border-gray-700 bg-[#0b1120] px-4 py-3 text-sm text-gray-300">
              Nenhuma partida pendente no momento.
            </p>
          )}
        </section>
      )}

      {lastActionLabel && tournament.status === 'RUNNING' && (
        <button
          type="button"
          onClick={handleUndoLastAction}
          disabled={isUndoingLastAction || pendingMatchId !== null}
          className="fixed bottom-6 right-4 z-50 h-12 rounded-full border border-gray-700 bg-[#111827] px-4 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(0,0,0,0.45)] transition hover:bg-[#1f2937] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
        >
          {isUndoingLastAction ? 'Desfazendo...' : 'Desfazer última ação'}
        </button>
      )}

      {isSeedOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto mt-16 w-full max-w-md rounded-3xl border border-gray-700 bg-[#0b1120] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
            <h3 className="mb-2 text-xl font-semibold text-white">Seed do sorteio</h3>
            <p className="mb-4 text-sm text-gray-300">
              Use esta seed para auditoria do sorteio.
            </p>
            <div className="mb-4 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3">
              <p className="break-all text-sm text-gray-100">
                {details?.drawSeed ?? 'Seed não disponível'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopySeed}
                disabled={!details?.drawSeed}
                className="h-12 rounded-xl bg-emerald-500 text-base font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
              >
                Copiar seed
              </button>
              <button
                type="button"
                onClick={() => setIsSeedOpen(false)}
                className="h-12 rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 [touch-action:manipulation]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {isPlayersOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto mt-8 w-full max-w-md rounded-3xl border border-gray-700 bg-[#0b1120] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
            <h3 className="mb-2 text-xl font-semibold text-white">Editar jogadores</h3>
            <p className="mb-4 text-sm text-gray-300">
              Ajuste nomes rapidamente sem sair da tela principal.
            </p>
            <ul className="mb-4 max-h-[52vh] space-y-3 overflow-auto pr-1">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="rounded-xl border border-gray-700 bg-gray-950 p-3"
                >
                  <label
                    htmlFor={`player-${player.id}`}
                    className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400"
                  >
                    Jogador
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`player-${player.id}`}
                      type="text"
                      autoComplete="off"
                      value={playerDrafts[player.id] ?? ''}
                      onChange={(event) =>
                        setPlayerDrafts((previous) => ({
                          ...previous,
                          [player.id]: event.target.value,
                        }))
                      }
                      className="h-11 flex-1 rounded-xl border border-gray-700 bg-[#0b1120] px-3 text-base text-white focus:border-emerald-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenamePlayer(player)}
                      disabled={updatingPlayerId === player.id}
                      className="h-11 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
                    >
                      {updatingPlayerId === player.id ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {playerError && (
              <GuidedErrorCard
                error={parseGuidedSystemErrorText(playerError)}
                className="mb-4"
              />
            )}
            <button
              type="button"
              onClick={() => setIsPlayersOpen(false)}
              className="h-12 w-full rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 [touch-action:manipulation]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {isFinishOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto mt-20 w-full max-w-md rounded-3xl border border-red-500/40 bg-[#1a0a0a] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
            <h3 className="mb-2 text-xl font-semibold text-white">Encerrar torneio</h3>
            <p className="mb-5 text-sm text-red-100">
              Essa ação finaliza o torneio agora. Você pode usar apenas quando quiser fechar oficialmente a competição.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleFinishTournament}
                disabled={isEndingTournament}
                className="h-12 rounded-xl bg-red-500 text-base font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-gray-700 [touch-action:manipulation]"
              >
                {isEndingTournament ? 'Encerrando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setIsFinishOpen(false)}
                disabled={isEndingTournament}
                className="h-12 rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 [touch-action:manipulation]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isQROpen && organizer?.publicSlug && (
        <TournamentQRModal
          tournamentId={tournamentId!}
          tournamentName={tournament.name}
          slug={organizer.publicSlug}
          onClose={() => setIsQROpen(false)}
        />
      )}
    </div>
  );
}

function ChampionshipClosureScreen({
  isLoading,
  tournamentName,
  finishedAt,
  champion,
  runnerUp,
  totalCollected,
  organizerAmount,
  totalPrize,
  championPrize,
  runnerUpPrize,
  thirdPlacePrize,
  fourthPlacePrize,
  tournamentId,
  isCelebrating,
  onShare,
  error,
}: {
  isLoading: boolean;
  tournamentName: string;
  finishedAt: string | null;
  champion: BracketPlayer | { id: string; name: string } | null;
  runnerUp: BracketPlayer | { id: string; name: string } | null;
  totalCollected: number | null;
  organizerAmount: number | null;
  totalPrize: number | null;
  championPrize: number | null;
  runnerUpPrize: number | null;
  thirdPlacePrize: number | null;
  fourthPlacePrize: number | null;
  tournamentId: string;
  isCelebrating: boolean;
  onShare: () => Promise<void>;
  error: string | null;
}) {
  if (error) {
    return (
      <GuidedErrorCard
        error={parseGuidedSystemErrorText(error)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/5 bg-[#05060c] p-6 animate-pulse text-gray-500">
        Fechando resultado oficial...
      </div>
    );
  }

  if (!champion) {
    return (
      <div className="rounded-3xl border border-white/5 bg-[#05060c] p-6 text-gray-400">
        Resultado final indisponivel no momento.
      </div>
    );
  }

  const finishedLabel = formatLongDate(finishedAt);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#020617] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.55)] sm:p-7">
      <style>{`
        @keyframes championshipFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes championshipGlow {
          0% { opacity: 0; }
          25% { opacity: 0.32; }
          100% { opacity: 0; }
        }
        @keyframes championshipConfetti {
          0% { opacity: 0; transform: translateY(-8px) scale(0.8); }
          20% { opacity: 0.7; }
          100% { opacity: 0; transform: translateY(130px) scale(1.05); }
        }
      `}</style>

      {isCelebrating && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-400/10 motion-safe:animate-[championshipGlow_1.8s_ease-out_forwards]" />
          {CHAMPIONSHIP_PARTICLES.map((particle, index) => (
            <span
              key={`${particle.left}-${index}`}
              className="absolute top-2 h-1.5 w-1.5 rounded-full bg-emerald-300/80 motion-safe:animate-[championshipConfetti_1.6s_ease-out_forwards]"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={[
          'relative motion-safe:animate-[championshipFade_420ms_ease-out]',
          isCelebrating ? 'will-change-transform' : '',
        ].join(' ')}
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300/90">
          Encerramento oficial
        </p>
        <h2 className="mt-3 text-center text-2xl font-semibold text-white sm:text-3xl">
          Campeão do Torneio
        </h2>
        <p className="mt-2 text-center font-display text-4xl text-emerald-200 sm:text-5xl">
          {champion.name}
        </p>
        <p className="mt-3 text-center text-base text-gray-300">
          Vice-campeão:{' '}
          <span className="font-semibold text-gray-100">
            {runnerUp?.name ?? 'Definição pendente'}
          </span>
        </p>
        <p className="mt-4 text-center text-sm text-gray-400">{tournamentName}</p>
        <p className="text-center text-sm text-gray-500">{finishedLabel}</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PrizeHighlightCard
            title="Valor do campeão"
            value={championPrize}
            accent="emerald"
          />
          <PrizeHighlightCard
            title="Valor do vice"
            value={runnerUpPrize}
            accent="slate"
          />
          {thirdPlacePrize != null && thirdPlacePrize > 0 && (
            <PrizeHighlightCard
              title="Valor do 3º lugar"
              value={thirdPlacePrize}
              accent="amber"
            />
          )}
          {fourthPlacePrize != null && fourthPlacePrize > 0 && (
            <PrizeHighlightCard
              title="Valor do 4º lugar"
              value={fourthPlacePrize}
              accent="slate"
            />
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-gray-700 bg-[#0b1120] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">
            Resumo financeiro
          </h3>
          <div className="space-y-2">
            <SummaryLine
              label="Total arrecadado"
              value={formatCurrency(totalCollected)}
            />
            <SummaryLine
              label="Valor do organizador"
              value={formatCurrency(organizerAmount)}
            />
            <SummaryLine
              label="Total da premiação"
              value={formatCurrency(totalPrize)}
            />
            <SummaryLine
              label="Valor do campeão"
              value={formatCurrency(championPrize)}
            />
            <SummaryLine
              label="Valor do vice"
              value={formatCurrency(runnerUpPrize)}
            />
            {thirdPlacePrize != null && thirdPlacePrize > 0 && (
              <SummaryLine
                label="Valor do 3º lugar"
                value={formatCurrency(thirdPlacePrize)}
              />
            )}
            {fourthPlacePrize != null && fourthPlacePrize > 0 && (
              <SummaryLine
                label="Valor do 4º lugar"
                value={formatCurrency(fourthPlacePrize)}
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            to={`/tournament/${tournamentId}/tv`}
            className="flex h-12 items-center justify-center rounded-xl bg-emerald-500 text-base font-semibold text-gray-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 [touch-action:manipulation]"
          >
            Abrir modo TV
          </Link>
          <button
            type="button"
            onClick={() => {
              void onShare();
            }}
            className="h-12 rounded-xl border border-gray-600 bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/50 [touch-action:manipulation]"
          >
            Compartilhar resultado
          </button>
          <Link
            to={`/app/tournament/${tournamentId}/history`}
            className="flex h-12 items-center justify-center rounded-xl border border-gray-600 bg-[#111827] text-base font-semibold text-white transition hover:bg-[#1f2937] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/50 [touch-action:manipulation]"
          >
            Ver resumo completo
          </Link>
        </div>
      </div>
    </section>
  );
}

function PrizeHighlightCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number | null;
  accent: 'emerald' | 'slate' | 'amber';
}) {
  const tone =
    accent === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : accent === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        : 'border-gray-600 bg-[#111827] text-gray-100';

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3 text-sm text-gray-200">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </p>
  );
}

function getOrderedMatches(rounds: BracketRound[]): OrderedMatch[] {
  return rounds.flatMap((round) =>
    [...round.matches]
      .sort((a, b) => a.positionInBracket - b.positionInBracket)
      .map((match) => ({
        match,
        roundNumber: round.roundNumber,
        roundLabel: round.label,
      }))
  );
}

function formatCurrency(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'R$\u00a00,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function formatLongDate(value: string | null): string {
  if (!value) return 'Data de encerramento indisponivel';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data de encerramento indisponivel';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

const CHAMPIONSHIP_PARTICLES = [
  { left: 8, delay: 0 },
  { left: 16, delay: 80 },
  { left: 24, delay: 160 },
  { left: 32, delay: 240 },
  { left: 40, delay: 320 },
  { left: 48, delay: 400 },
  { left: 56, delay: 480 },
  { left: 64, delay: 560 },
  { left: 72, delay: 640 },
  { left: 80, delay: 720 },
  { left: 88, delay: 800 },
];

function deriveRunnerUp(rounds: BracketRound[], totalRounds: number) {
  if (totalRounds === 0) return null;
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound || finalRound.matches.length !== 1) return null;
  const finalMatch = finalRound.matches[0];
  if (!finalMatch.winner || !finalMatch.player2) return null;
  return finalMatch.winner.id === finalMatch.player1.id
    ? finalMatch.player2
    : finalMatch.player1;
}

function QRIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3z" />
      <path d="M17 17h3v3h-3z" />
      <path d="M14 20v1" />
      <path d="M20 14v1" />
    </svg>
  );
}

function extractTournamentPlayers(rounds: BracketRound[]): BracketPlayer[] {
  const firstRound = rounds.find((round) => round.roundNumber === 1) ?? rounds[0];
  if (!firstRound) return [];

  const uniquePlayers = new Map<string, BracketPlayer>();
  for (const match of firstRound.matches) {
    uniquePlayers.set(match.player1.id, match.player1);
    if (match.player2) {
      uniquePlayers.set(match.player2.id, match.player2);
    }
  }

  return Array.from(uniquePlayers.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR')
  );
}
