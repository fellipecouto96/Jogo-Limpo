export interface BracketPlayer {
  id: string;
  name: string;
}

export interface BracketMatch {
  id: string;
  positionInBracket: number;
  player1: BracketPlayer;
  player2: BracketPlayer;
  winner: BracketPlayer | null;
  finishedAt: string | null;
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
