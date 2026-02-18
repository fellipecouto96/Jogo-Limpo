export interface BracketPlayer {
  id: string;
  name: string;
}

export interface BracketMatch {
  id: string;
  positionInBracket: number;
  player1: BracketPlayer;
  player2: BracketPlayer | null;
  winner: BracketPlayer | null;
  player1Score: number | null;
  player2Score: number | null;
  isBye: boolean;
  finishedAt: string | null;
}

export interface TournamentStatistics {
  totalMatches: number;
  completedMatches: number;
  totalGames: number;
  highestScoringPlayer: { id: string; name: string; totalScore: number } | null;
  biggestWinMargin: { matchId: string; margin: number; winner: string; loser: string } | null;
  averageScorePerMatch: number;
  finalScore: { player1: string; player2: string; score1: number; score2: number } | null;
  playerCount: number;
}

export interface BracketRound {
  id: string;
  roundNumber: number;
  label: string;
  matches: BracketMatch[];
}

export interface TournamentInfo {
  id: string;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED';
  startedAt: string | null;
  finishedAt: string | null;
}

export interface BracketData {
  tournament: TournamentInfo;
  totalRounds: number;
  rounds: BracketRound[];
  champion: BracketPlayer | null;
}
