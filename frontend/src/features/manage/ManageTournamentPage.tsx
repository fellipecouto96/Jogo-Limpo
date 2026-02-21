import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useManageBracket } from './useManageBracket.ts';
import { useRecordResult } from './useRecordResult.ts';
import { InteractiveMatchCard } from './components/InteractiveMatchCard.tsx';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { useTournamentDetails } from './useTournamentDetails.ts';
import type { BracketMatch, BracketPlayer, BracketRound } from '../tv/types.ts';
import { deriveRunnerUp, deriveThirdAndFourth, derivePodiumScoreRows } from './podium.ts';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import { useOnboarding } from '../../shared/useOnboarding.ts';
import { OnboardingHint } from '../../shared/OnboardingHint.tsx';
import { TournamentQRModal } from './TournamentQRModal.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import {
  formatGuidedSystemError,
  parseGuidedSystemErrorText,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';
import {
  ActionLoadingButton,
  TournamentPageSkeleton,
} from '../../shared/loading/LoadingSystem.tsx';

interface OrderedMatch {
  match: BracketMatch;
  roundNumber: number;
  roundLabel: string;
}

interface UndoLastResultResponse {
  matchId: string;
}

interface OptimisticMatchState {
  winnerId: string;
  player1Score: number | null;
  player2Score: number | null;
}

interface RecentAdvanceState {
  matchId: string;
  winnerId: string;
}

const ACTION_DEBOUNCE_MS = 180;

export function ManageTournamentPage() {
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
  const [isLateEntryOpen, setIsLateEntryOpen] = useState(false);
  const [lateEntryName, setLateEntryName] = useState('');
  const [lateEntryDuplicate, setLateEntryDuplicate] = useState<string | null>(null);
  const [isSubmittingLateEntry, setIsSubmittingLateEntry] = useState(false);
  const [isRebuyConfirmOpen, setIsRebuyConfirmOpen] = useState(false);
  const [pendingRebuyPlayerId, setPendingRebuyPlayerId] = useState<string | null>(null);
  const [isShareScriptOpen, setIsShareScriptOpen] = useState(false);
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
  const [recentAdvance, setRecentAdvance] = useState<RecentAdvanceState | null>(null);
  const [optimisticMatches, setOptimisticMatches] = useState<
    Record<string, OptimisticMatchState>
  >({});
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
  const lastActionAtRef = useRef(0);
  const { recordResult, updateScore } = useRecordResult();
  const players = useMemo(
    () => extractTournamentPlayers(data?.rounds ?? []),
    [data?.rounds]
  );
  const tournamentStatus = data?.tournament.status ?? null;
  const tournamentPublicSlug = details?.publicSlug ?? null;
  const orderedMatchesLive = useMemo(
    () => getOrderedMatches(data?.rounds ?? []),
    [data?.rounds]
  );
  const roundsWithOptimistic = useMemo(
    () =>
      (data?.rounds ?? []).map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          const optimistic = optimisticMatches[match.id];
          if (!optimistic) return match;

          const optimisticWinner =
            optimistic.winnerId === match.player1.id
              ? match.player1
              : optimistic.winnerId === match.player2?.id
                ? match.player2
                : match.winner;

          return {
            ...match,
            winner: optimisticWinner,
            player1Score: optimistic.player1Score,
            player2Score: optimistic.player2Score,
          };
        }),
      })),
    [data?.rounds, optimisticMatches]
  );
  const orderedMatchesOptimistic = useMemo(
    () => getOrderedMatches(roundsWithOptimistic),
    [roundsWithOptimistic]
  );

  function isActionDebounced() {
    const now = Date.now();
    if (now - lastActionAtRef.current < ACTION_DEBOUNCE_MS) {
      return true;
    }
    lastActionAtRef.current = now;
    return false;
  }

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
  }, [markComplete, tournamentStatus, triggerToast]);

  useEffect(() => {
    if (!isChampionshipCelebrating) return;
    const timeout = setTimeout(() => {
      setIsChampionshipCelebrating(false);
    }, 2200);
    return () => clearTimeout(timeout);
  }, [isChampionshipCelebrating]);

  useEffect(() => {
    if (!recentAdvance) return;
    const timer = setTimeout(() => {
      setRecentAdvance(null);
    }, 340);
    return () => clearTimeout(timer);
  }, [recentAdvance]);

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
    const tournamentName = data?.tournament.name ?? 'Torneio';
    const championName = details?.champion?.name ?? data?.champion?.name ?? 'Campeão';
    const runnerUpFallback = data
      ? deriveRunnerUp(data.rounds, data.totalRounds)?.name
      : null;
    const thirdAndFourthFromBracket = data
      ? deriveThirdAndFourth(data.rounds, data.totalRounds)
      : { thirdPlace: null, fourthPlace: null };
    const runnerUpName = details?.runnerUp?.name ?? runnerUpFallback ?? 'Vice-campeão';
    const thirdPlaceName = thirdAndFourthFromBracket.thirdPlace?.name ?? null;
    const fourthPlaceName = thirdAndFourthFromBracket.fourthPlace?.name ?? null;
    const championAmount = details?.championPrize ?? details?.firstPlacePrize ?? null;
    const runnerUpAmount = details?.runnerUpPrize ?? details?.secondPlacePrize ?? null;
    const thirdPlaceAmount = details?.thirdPlacePrize ?? null;
    const fourthPlaceAmount = details?.fourthPlacePrize ?? null;
    const playerCount = details?.playerCount ?? null;
    const dateStr = formatShareDate(details?.finishedAt ?? details?.startedAt ?? null);
    const shareUrl = tournamentPublicSlug
      ? `${window.location.origin}/tournament/${tournamentPublicSlug}`
      : `${window.location.origin}/tournament/${tournamentId}/tv`;

    const hasPrize = championAmount != null || runnerUpAmount != null;
    const lines: string[] = [
      `RESULTADO OFICIAL – ${tournamentName}`,
      '',
      `Campeão ${championName}`,
      `Vice ${runnerUpName}`,
    ];
    if (thirdPlaceName) lines.push(`3º lugar ${thirdPlaceName}`);
    if (fourthPlaceName) lines.push(`4º lugar ${fourthPlaceName}`);
    if (hasPrize) {
      lines.push('');
      lines.push('Premiação:');
      if (championAmount != null) lines.push(`${formatCurrency(championAmount)}`);
      if (runnerUpAmount != null) lines.push(`${formatCurrency(runnerUpAmount)}`);
      if (thirdPlaceAmount != null && thirdPlaceAmount > 0) lines.push(`${formatCurrency(thirdPlaceAmount)}`);
      if (fourthPlaceAmount != null && fourthPlaceAmount > 0) lines.push(`${formatCurrency(fourthPlaceAmount)}`);
    }
    lines.push('');
    const infoLine = [
      playerCount != null ? `${playerCount} jogadores` : null,
      dateStr,
    ].filter(Boolean).join(' · ');
    if (infoLine) lines.push(infoLine);
    lines.push('');
    lines.push('Confira a chave completa:');
    lines.push(`${shareUrl}`);
    const message = lines.join('\n');

    setActionError(null);
    setFeedback(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Resultado - ${tournamentName}`,
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

  async function handleLateEntry(force = false) {
    const name = lateEntryName.trim();
    if (!name) return;

    setIsSubmittingLateEntry(true);
    setActionError(null);

    try {
      const response = await apiFetch(`/tournaments/${tournamentId}/late-entry`, {
        method: 'POST',
        body: JSON.stringify({ playerName: name, force }),
      });

      if (response.status === 409) {
        const payload = await response.json();
        if (payload.isDuplicate) {
          setLateEntryDuplicate(payload.existingName);
          return;
        }
        throw await buildHttpResponseError(response);
      }

      if (!response.ok) {
        throw await buildHttpResponseError(response);
      }

      const payload = await response.json() as { paired?: boolean };
      await Promise.all([refetch(), refetchDetails()]);
      if (payload.paired === false) {
        setFeedback(`Jogador "${name}" registrado. Aguardando outro jogador para formar par na Rodada 1.`);
      } else {
        setFeedback(`Jogador "${name}" adicionado e pareado na Rodada 1.`);
      }
      setIsLateEntryOpen(false);
      setLateEntryName('');
      setLateEntryDuplicate(null);
    } catch (err) {
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setIsSubmittingLateEntry(false);
    }
  }

  function requestRebuy(playerId: string) {
    setPendingRebuyPlayerId(playerId);
    setIsRebuyConfirmOpen(true);
  }

  async function handleRebuy(playerId: string) {
    setActionError(null);
    setFeedback(null);

    try {
      const response = await apiFetch(`/tournaments/${tournamentId}/players/${playerId}/rebuy`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw await buildHttpResponseError(response);
      }
      const payload = await response.json() as { paired?: boolean };
      await Promise.all([refetch(), refetchDetails()]);
      if (payload.paired) {
        setFeedback('Repescagem: partida criada com sucesso. Os jogadores disputarao a Rodada de Repescagem.');
      } else {
        setFeedback('E necessario pelo menos 2 jogadores para iniciar a repescagem. Aguardando mais jogadores.');
      }
    } catch (err) {
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
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
    if (pendingMatchId || isUndoingLastAction || isActionDebounced()) return;

    setPendingMatchId(entry.match.id);
    setActionError(null);
    setFeedback(null);
    setOptimisticMatches((previous) => ({
      ...previous,
      [entry.match.id]: {
        winnerId,
        player1Score: player1Score ?? null,
        player2Score: player2Score ?? null,
      },
    }));
    try {
      await recordResult(tournamentId!, entry.match.id, winnerId, player1Score, player2Score);
      const scoreLabel = player1Score !== undefined && player2Score !== undefined
        ? ` (${player1Score} x ${player2Score})`
        : '';
      setLastActionLabel(`${winnerName} venceu${scoreLabel}`);
      setFeedback('\u2714 Resultado registrado');
      setRecentAdvance({ matchId: entry.match.id, winnerId });
      setScrollFromMatch({
        roundNumber: entry.roundNumber,
        positionInBracket: entry.match.positionInBracket,
      });
      await Promise.all([refetch(), refetchDetails()]);
      triggerToast('toast-first-winner');
      setOptimisticMatches((previous) => {
        const next = { ...previous };
        delete next[entry.match.id];
        return next;
      });
    } catch (err) {
      setOptimisticMatches((previous) => {
        const next = { ...previous };
        delete next[entry.match.id];
        return next;
      });
      setActionError(
        formatGuidedSystemError(
          resolveGuidedSystemError({
            error: err,
            context: 'default',
          })
        )
      );
    } finally {
      setPendingMatchId(null);
    }
  }

  async function handleUpdateScore(matchId: string, player1Score: number, player2Score: number) {
    if (pendingMatchId || isUndoingLastAction || isActionDebounced()) return;

    setPendingMatchId(matchId);
    setActionError(null);
    setFeedback(null);
    const currentMatch = orderedMatchesLive.find(
      ({ match }) => match.id === matchId
    )?.match;
    const currentWinnerId = currentMatch?.winner?.id;
    if (currentWinnerId) {
      setOptimisticMatches((previous) => ({
        ...previous,
        [matchId]: {
          winnerId: currentWinnerId,
          player1Score,
          player2Score,
        },
      }));
    }
    try {
      await updateScore(tournamentId!, matchId, player1Score, player2Score);
      setFeedback(`Placar atualizado: ${player1Score} x ${player2Score}`);
      await Promise.all([refetch(), refetchDetails()]);
      setOptimisticMatches((previous) => {
        const next = { ...previous };
        delete next[matchId];
        return next;
      });
    } catch (err) {
      setOptimisticMatches((previous) => {
        const next = { ...previous };
        delete next[matchId];
        return next;
      });
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
    if (!lastActionLabel || isUndoingLastAction || pendingMatchId || isActionDebounced()) return;

    const previousLabel = lastActionLabel;
    setIsUndoingLastAction(true);
    setActionError(null);
    setFeedback(null);
    setLastActionLabel(null);
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
      setScrollToMatchId(payload.matchId);
      await Promise.all([refetch(), refetchDetails()]);
    } catch (err) {
      setLastActionLabel(previousLabel);
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

    const pending = orderedMatchesLive.filter(
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
  }, [orderedMatchesLive, scrollFromMatch]);

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
    const playable = orderedMatchesLive.filter(
      ({ match }) => !match.isBye && match.player2 !== null
    );
    const completed = playable.filter(({ match }) => Boolean(match.winner));
    if (playable.length > 0 && completed.length === 0) {
      drawToastFiredRef.current = true;
      triggerToast('toast-first-draw');
    }
  }, [data, orderedMatchesLive, triggerToast]);

  if (isLoading) {
    return <TournamentPageSkeleton />;
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

  const { tournament, totalRounds, champion: bracketChampion } = data;
  const orderedMatches = orderedMatchesOptimistic;
  const playableMatches = orderedMatches.filter(
    ({ match }) => !match.isBye && match.player2 !== null
  );
  const activeMatches = playableMatches.filter(({ match }) => !match.winner);
  const completedMatches = playableMatches.filter(({ match }) => Boolean(match.winner));
  const completedCount = completedMatches.length;
  const totalCount = playableMatches.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const runnerUpFromBracket = deriveRunnerUp(roundsWithOptimistic, totalRounds);
  const thirdAndFourthFromBracket = deriveThirdAndFourth(
    roundsWithOptimistic,
    totalRounds
  );
  const podiumScoreRows = derivePodiumScoreRows(roundsWithOptimistic, totalRounds);
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
            className="hidden sm:flex h-11 items-center justify-center rounded-xl bg-gray-800 px-4 text-sm font-semibold text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Modo TV
          </Link>
          <Link
            to={`/tournament/${tournamentId}/mobile`}
            className="hidden sm:flex h-11 items-center justify-center rounded-xl bg-gray-800 px-4 text-sm font-semibold text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Celular
          </Link>
          {tournament.status === 'RUNNING' && details?.allowLateEntry && (
            <button
              type="button"
              onClick={() => { setIsLateEntryOpen(true); setLateEntryName(''); setLateEntryDuplicate(null); }}
              className="flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white border border-emerald-500 hover:bg-emerald-500 transition-colors [touch-action:manipulation]"
            >
              + Jogador atrasado
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsQROpen(true)}
            disabled={!tournamentPublicSlug}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-800 px-4 text-sm font-semibold text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 [touch-action:manipulation]"
          >
            <QRIcon />
            <span className="hidden sm:inline">Compartilhar este torneio</span>
          </button>
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
                <Link
                  to={`/tournament/${tournamentId}/tv`}
                  onClick={() => setIsMenuOpen(false)}
                  className="sm:hidden mb-1 flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40"
                >
                  Modo TV
                </Link>
                <Link
                  to={`/tournament/${tournamentId}/mobile`}
                  onClick={() => setIsMenuOpen(false)}
                  className="sm:hidden mb-1 flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40"
                >
                  Celular
                </Link>
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
                {(details?.allowLateEntry || details?.allowRebuy) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsShareScriptOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="mb-1 flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40 [touch-action:manipulation]"
                  >
                    Explicação rápida para jogadores
                  </button>
                )}
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
        <p className="jl-fade-in mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
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
            thirdPlace={thirdAndFourthFromBracket.thirdPlace}
            fourthPlace={thirdAndFourthFromBracket.fourthPlace}
            podiumScoreRows={podiumScoreRows}
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

          {roundsWithOptimistic.map((round) => {
            const matches = [...round.matches].sort(
              (a, b) => a.positionInBracket - b.positionInBracket
            );
            const isNewRound = matches.length > 0 && matches.every((m) => !m.winner && !m.isBye);

            return (
              <div key={round.id} className={['space-y-3', isNewRound ? 'jl-round-advance' : ''].join(' ')}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {round.label}
                </h2>
                {matches.length === 0 ? (
                  <p className="rounded-xl border border-gray-800 bg-[#0b1120] px-4 py-3 text-sm text-gray-400">
                    Aguardando conclusão da rodada anterior.
                  </p>
                ) : (
                  matches.map((match) => {
                    const isThirdPlaceMatch =
                      round.roundNumber === totalRounds && match.positionInBracket === 2;
                    const matchLabel = isThirdPlaceMatch ? 'Disputa de 3º Lugar' : round.label;
                    const entry: OrderedMatch = {
                      match,
                      roundNumber: round.roundNumber,
                      roundLabel: matchLabel,
                    };

                    return (
                      <div
                        key={match.id}
                        ref={(node) => {
                          matchRefs.current[match.id] = node;
                        }}
                      >
                        {isThirdPlaceMatch && (
                          <h2 className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-400/80">
                            Disputa de 3º Lugar
                          </h2>
                        )}
                        <InteractiveMatchCard
                          match={match}
                          roundLabel={matchLabel}
                          tournamentStatus={tournament.status}
                          isBusy={pendingMatchId !== null || isUndoingLastAction}
                          isPending={pendingMatchId === match.id}
                          recentWinnerId={
                            recentAdvance?.matchId === match.id
                              ? recentAdvance.winnerId
                              : null
                          }
                          animateConnector={recentAdvance?.matchId === match.id}
                          allowRebuy={details?.allowRebuy === true}
                          onSelectWinner={(winnerId, winnerName, score1, score2) =>
                            handleSelectWinner(entry, winnerId, winnerName, score1, score2)
                          }
                          onUpdateScore={handleUpdateScore}
                          onRebuy={details?.allowRebuy ? requestRebuy : undefined}
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
        <ActionLoadingButton
          type="button"
          onClick={handleUndoLastAction}
          disabled={pendingMatchId !== null}
          isLoading={isUndoingLastAction}
          idleLabel="Desfazer ultima acao"
          loadingLabel="Atualizando dados"
          className="fixed bottom-6 right-4 z-50 h-12 min-w-[190px] rounded-full border border-gray-700 bg-[#111827] px-4 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(0,0,0,0.45)] transition hover:bg-[#1f2937] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
        >
          Desfazer ultima acao
        </ActionLoadingButton>
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
                      className="h-11 min-w-[96px] rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
                    >
                      {updatingPlayerId === player.id ? 'Salvando' : 'Salvar'}
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
                {isEndingTournament ? 'Finalizando torneio' : 'Confirmar'}
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

      {isRebuyConfirmOpen && pendingRebuyPlayerId && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto mt-20 w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#120d00] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
            <h3 className="mb-2 text-xl font-semibold text-white">Confirmar repescagem</h3>
            <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Jogador disputará rodada de repescagem. Apenas vencedores avançam.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRebuyConfirmOpen(false);
                  void handleRebuy(pendingRebuyPlayerId);
                  setPendingRebuyPlayerId(null);
                }}
                className="h-12 rounded-xl bg-amber-500 text-base font-semibold text-gray-950 transition hover:bg-amber-400 [touch-action:manipulation]"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => { setIsRebuyConfirmOpen(false); setPendingRebuyPlayerId(null); }}
                className="h-12 rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 [touch-action:manipulation]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isShareScriptOpen && (
        <ShareScriptModal
          allowLateEntry={details?.allowLateEntry ?? false}
          allowRebuy={details?.allowRebuy ?? false}
          onClose={() => setIsShareScriptOpen(false)}
        />
      )}

      {isQROpen && tournamentPublicSlug && (
        <TournamentQRModal
          tournamentSlug={tournamentPublicSlug}
          tournamentName={tournament.name}
          tournamentDate={
            details?.startedAt ?? details?.createdAt ?? tournament.startedAt ?? null
          }
          onClose={() => setIsQROpen(false)}
        />
      )}

      {isLateEntryOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto mt-16 w-full max-w-md rounded-3xl border border-gray-700 bg-[#0b1120] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
            <h3 className="mb-1 text-xl font-semibold text-white">Entrada tardia</h3>
            <p className="mb-4 text-sm text-gray-400">
              Taxa:{' '}
              <span className="font-semibold text-gray-200">
                {details?.lateEntryFee != null
                  ? formatCurrency(details.lateEntryFee)
                  : details?.entryFee != null
                    ? formatCurrency(details.entryFee)
                    : 'Sem taxa'}
              </span>
            </p>

            <label htmlFor="late-entry-name" className="mb-1 block text-sm font-semibold text-gray-300">
              Nome do jogador
            </label>
            <input
              id="late-entry-name"
              type="text"
              autoComplete="off"
              value={lateEntryName}
              onChange={(e) => { setLateEntryName(e.target.value); setLateEntryDuplicate(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && lateEntryName.trim()) handleLateEntry(false); }}
              placeholder="Nome do jogador"
              className="mb-3 h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-4 text-base text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
            />

            {lateEntryDuplicate && (
              <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3">
                <p className="mb-2 text-sm text-amber-100">
                  Já existe um jogador chamado "{lateEntryDuplicate}" neste torneio. Deseja continuar mesmo assim?
                </p>
                <button
                  type="button"
                  onClick={() => handleLateEntry(true)}
                  disabled={isSubmittingLateEntry}
                  className="h-10 w-full rounded-xl bg-amber-500 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 [touch-action:manipulation]"
                >
                  Confirmar mesmo assim
                </button>
              </div>
            )}

            <p className="mb-3 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
              Jogador entrará na 1ª rodada e precisará jogar normalmente.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleLateEntry(false)}
                disabled={!lateEntryName.trim() || isSubmittingLateEntry}
                className="h-12 rounded-xl bg-emerald-500 text-base font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 [touch-action:manipulation]"
              >
                {isSubmittingLateEntry ? 'Adicionando...' : 'Adicionar jogador'}
              </button>
              <button
                type="button"
                onClick={() => { setIsLateEntryOpen(false); setLateEntryName(''); setLateEntryDuplicate(null); }}
                disabled={isSubmittingLateEntry}
                className="h-12 rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 [touch-action:manipulation]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
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
  thirdPlace,
  fourthPlace,
  podiumScoreRows,
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
  thirdPlace: BracketPlayer | { id: string; name: string } | null;
  fourthPlace: BracketPlayer | { id: string; name: string } | null;
  podiumScoreRows: Array<{
    label: string;
    matchup: string;
    score: string;
    finishedAt: string | null;
  }>;
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
        Atualizando dados
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
          🏆 {champion.name}
        </p>
        <p className="mt-3 text-center text-base text-gray-300">
          Vice-campeão:{' '}
          <span className="font-semibold text-gray-100">
            {runnerUp?.name ?? 'Definição pendente'}
          </span>
        </p>
        {thirdPlacePrize != null && thirdPlacePrize > 0 && (
          <p className="mt-2 text-center text-base text-gray-300">
            3º lugar:{' '}
            <span className="font-semibold text-gray-100">
              {thirdPlace?.name ?? 'Definição pendente'}
            </span>
          </p>
        )}
        {fourthPlacePrize != null && fourthPlacePrize > 0 && (
          <p className="mt-1 text-center text-base text-gray-300">
            4º lugar:{' '}
            <span className="font-semibold text-gray-100">
              {fourthPlace?.name ?? 'Definição pendente'}
            </span>
          </p>
        )}
        <p className="mt-4 text-center text-sm text-gray-400">{tournamentName}</p>
        <p className="text-center text-sm text-gray-500">{finishedLabel}</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PrizeHighlightCard
            title="🥇 Campeão"
            value={championPrize}
            accent="emerald"
          />
          <PrizeHighlightCard
            title="🥈 Vice"
            value={runnerUpPrize}
            accent="slate"
          />
          {thirdPlacePrize != null && thirdPlacePrize > 0 && (
            <PrizeHighlightCard
              title="🥉 3º lugar"
              value={thirdPlacePrize}
              accent="amber"
            />
          )}
          {fourthPlacePrize != null && fourthPlacePrize > 0 && (
            <PrizeHighlightCard
              title="🎖 4º lugar"
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

        {podiumScoreRows.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0b1120] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">
              Placares registrados
            </h3>
            <div className="space-y-2">
              {podiumScoreRows.map((row) => (
                <div key={`${row.label}-${row.matchup}`} className="rounded-xl border border-gray-700/70 bg-[#101826] px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">{row.label}</p>
                  <p className="text-sm text-gray-200">{row.matchup}</p>
                  <p className="text-base font-semibold text-white">{row.score}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
            className="h-12 rounded-xl bg-emerald-500 text-base font-semibold text-gray-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 [touch-action:manipulation]"
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

function formatShareDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
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

function ShareScriptModal({
  allowLateEntry,
  allowRebuy,
  onClose,
}: {
  allowLateEntry: boolean;
  allowRebuy: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const lines: string[] = ['Pessoal, atenção às regras:', ''];

  if (allowLateEntry && allowRebuy) {
    lines.push('Hoje temos entrada tardia e repescagem.', '');
  } else if (allowLateEntry) {
    lines.push('Hoje temos entrada tardia.', '');
  } else if (allowRebuy) {
    lines.push('Hoje temos repescagem.', '');
  }

  if (allowLateEntry) {
    lines.push(
      'Entrada tardia:',
      'Quem chegar depois pode entrar apenas enquanto a 1ª rodada estiver ativa.',
      'Vai jogar normalmente, sem vantagem.',
      ''
    );
  }

  if (allowRebuy) {
    lines.push(
      'Repescagem:',
      'Quem perder na 1ª rodada pode pagar nova inscrição e disputar uma rodada extra.',
      'Só quem vencer essa rodada volta para a próxima fase.',
      ''
    );
  }

  lines.push('Aqui ninguém avança sem jogar.', 'O torneio continua justo para todos.');

  const script = lines.join('\n');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select textarea
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="mx-auto mt-10 w-full max-w-md rounded-3xl border border-gray-700 bg-[#0b1120] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
        <h3 className="mb-1 text-xl font-semibold text-white">Explicação rápida para jogadores</h3>
        <p className="mb-3 text-sm text-gray-400">Copie e envie no grupo antes de começar.</p>
        <div className="mb-3 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3">
          <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">{script}</pre>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className={[
              'h-12 rounded-xl text-base font-semibold transition [touch-action:manipulation]',
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 text-gray-950 hover:bg-emerald-400',
            ].join(' ')}
          >
            {copied ? 'Copiado!' : 'Copiar texto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl bg-gray-800 text-base font-semibold text-white transition hover:bg-gray-700 [touch-action:manipulation]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
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
