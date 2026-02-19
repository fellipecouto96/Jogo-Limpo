export interface TournamentListItem {
  id: string;
  publicSlug: string | null;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED';
  organizer: { id: string; name: string };
  playerCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TournamentListResponse {
  items: TournamentListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
