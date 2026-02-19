export interface TournamentListItem {
  id: string;
  publicSlug: string | null;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED';
  organizer: { id: string; name: string };
  playerCount: number;
  championName: string | null;
  totalCollected: number | null;
  organizerProfit: number | null;
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
