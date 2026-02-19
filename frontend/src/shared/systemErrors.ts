import { normalizeApiError } from './api.ts';

export type ErrorContext = 'default' | 'prize' | 'draw' | 'public_link' | 'auth';

export interface GuidedSystemError {
  kind: 'connection' | 'validation' | 'public_link' | 'unexpected' | 'generic';
  what: string;
  why: string;
  next: string;
  helper?: string;
  actionLabel?: string;
  actionHref?: string;
}

const FIRST_TOURNAMENT_HELPER =
  'Se for seu primeiro torneio, revise os passos acima.';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function withHelper(
  message: GuidedSystemError,
  includeFirstTournamentHint: boolean
): GuidedSystemError {
  if (!includeFirstTournamentHint) return message;
  return {
    ...message,
    helper: FIRST_TOURNAMENT_HELPER,
  };
}

export function isConnectionErrorMessage(message: GuidedSystemError): boolean {
  return message.kind === 'connection';
}

export function isRetryableErrorMessage(message: GuidedSystemError): boolean {
  return message.kind === 'connection' || message.kind === 'unexpected';
}

export function formatGuidedSystemError(message: GuidedSystemError): string {
  return [message.what, '', message.why, '', message.next, message.helper ?? '']
    .filter((line) => line.length > 0)
    .join('\n');
}

export function parseGuidedSystemErrorText(text: string): GuidedSystemError {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [what = 'Ocorreu um erro inesperado.', why = 'Estamos registrando o problema.', next = 'Tente novamente em alguns segundos.', helper] = lines;

  if (what === 'Nao foi possivel concluir agora.') {
    return {
      kind: 'connection',
      what,
      why,
      next,
      helper,
      actionLabel: 'Tentar novamente',
    };
  }

  if (what === 'Link invalido ou torneio nao encontrado.') {
    return {
      kind: 'public_link',
      what,
      why,
      next,
      helper,
      actionLabel: 'Voltar para pagina principal',
      actionHref: '/',
    };
  }

  if (what === 'A divisao da premiacao precisa fechar 100%.') {
    return { kind: 'validation', what, why, next, helper };
  }

  if (what === 'Ocorreu um erro inesperado.') {
    return {
      kind: 'unexpected',
      what,
      why,
      next,
      helper,
      actionLabel: 'Tentar novamente',
    };
  }

  return { kind: 'generic', what, why, next, helper };
}

export function resolveGuidedSystemError(options: {
  error?: unknown;
  context?: ErrorContext;
  includeFirstTournamentHint?: boolean;
}): GuidedSystemError {
  const { context = 'default', includeFirstTournamentHint = false } = options;
  const normalized = normalizeApiError(options.error);
  const raw = normalizeText(normalized.backendError ?? normalized.message ?? '');

  const prizeValidationMessage: GuidedSystemError = {
    kind: 'validation',
    what: 'A divisao da premiacao precisa fechar 100%.',
    why: 'A soma dos percentuais ainda nao chegou em 100%.',
    next: 'Ajuste os percentuais ate completar 100%.',
  };

  const drawPlayersMessage: GuidedSystemError = {
    kind: 'validation',
    what: 'Torneio precisa de pelo menos 2 jogadores para sortear.',
    why: 'Com menos de 2 jogadores, nao e possivel montar os confrontos.',
    next: 'Adicione mais jogadores e tente novamente.',
  };

  const connectionMessage: GuidedSystemError = {
    kind: 'connection',
    what: 'Nao foi possivel concluir agora.',
    why: 'Houve uma instabilidade de conexao.',
    next: 'Verifique sua conexao e tente novamente.',
    actionLabel: 'Tentar novamente',
  };

  const unexpectedMessage: GuidedSystemError = {
    kind: 'unexpected',
    what: 'Ocorreu um erro inesperado.',
    why: 'Estamos registrando o problema.',
    next: 'Tente novamente em alguns segundos.',
    actionLabel: 'Tentar novamente',
  };

  const publicLinkMessage: GuidedSystemError = {
    kind: 'public_link',
    what: 'Link invalido ou torneio nao encontrado.',
    why: 'O endereco pode estar incompleto ou desatualizado.',
    next: 'Volte para a pagina principal e abra o link novamente.',
    actionLabel: 'Voltar para pagina principal',
    actionHref: '/',
  };

  const authMessage: GuidedSystemError = {
    kind: 'generic',
    what: 'Nao foi possivel concluir seu acesso agora.',
    why: 'Os dados informados podem estar incorretos ou indisponiveis no momento.',
    next: 'Revise email e senha e tente novamente.',
  };

  const genericMessage: GuidedSystemError = {
    kind: 'generic',
    what: 'Nao foi possivel concluir esta etapa.',
    why: 'Algumas informacoes precisam de ajuste.',
    next: 'Revise os dados e tente novamente.',
  };

  const hasPrizeValidationSignal =
    raw.includes('sum to 100') ||
    raw.includes('somar 100') ||
    raw.includes('soma') ||
    (raw.includes('premia') && raw.includes('100')) ||
    raw.includes('percentages');

  if (normalized.isNetwork) {
    return withHelper(connectionMessage, includeFirstTournamentHint);
  }

  if (context === 'prize' || hasPrizeValidationSignal) {
    return withHelper(prizeValidationMessage, includeFirstTournamentHint);
  }

  const hasMinPlayersSignal =
    raw.includes('at least 2 players') ||
    raw.includes('pelo menos 2 jogadores');

  if (context === 'draw' || hasMinPlayersSignal) {
    return withHelper(drawPlayersMessage, includeFirstTournamentHint);
  }

  const hasPublicSignal =
    context === 'public_link' ||
    (normalized.status === 404 &&
      (raw.includes('not found') ||
        raw.includes('nao encontrado') ||
        raw.includes('invalido') ||
        raw.includes('slug')));

  if (hasPublicSignal) {
    return withHelper(publicLinkMessage, includeFirstTournamentHint);
  }

  if (context === 'auth' && normalized.status && normalized.status < 500) {
    return withHelper(authMessage, includeFirstTournamentHint);
  }

  if (normalized.status != null && normalized.status >= 500) {
    return withHelper(unexpectedMessage, includeFirstTournamentHint);
  }

  if (normalized.status != null && normalized.status >= 400) {
    return withHelper(genericMessage, includeFirstTournamentHint);
  }

  return withHelper(unexpectedMessage, includeFirstTournamentHint);
}

export function getRemainingPercentageMessage(remaining: number): string {
  if (Math.abs(remaining) < 0.01) {
    return 'Total configurado: 100%.';
  }

  if (remaining > 0) {
    return `Falta ${remaining.toFixed(2)}% para fechar 100%.`;
  }

  return `Passe ${Math.abs(remaining).toFixed(2)}% do total. Reduza os percentuais.`;
}
