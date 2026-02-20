export const LOG_JOURNEYS = {
  AUTH: 'auth',
  ONBOARDING: 'onboarding',
  DRAW: 'draw',
  BRACKET: 'bracket',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  TOURNAMENT_LIST: 'tournament_list',
  TOURNAMENT_DETAIL: 'tournament_detail',
  TOURNAMENT_FINANCIALS: 'tournament_financials',
  TOURNAMENT_FINISH: 'tournament_finish',
  TOURNAMENT_PLAYER: 'tournament_player',
  TOURNAMENT_STATS: 'tournament_stats',
  RECORD_RESULT: 'record_result',
  PUBLIC_PROFILE: 'public_profile',
  PUBLIC_TOURNAMENT: 'public_tournament',
  PUBLIC_PAGE: 'public_page',
  ADVANCE_WINNER: 'advance_winner',
  SERVER_ERROR: 'server_error',
} as const;

export type LogJourney = typeof LOG_JOURNEYS[keyof typeof LOG_JOURNEYS];
