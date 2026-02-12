export interface TournamentListItem {
  id: string;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED';
  organizer: { id: string; name: string };
  playerCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
