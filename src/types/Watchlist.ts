export interface WatchlistEntry {
  symbol: string;
  addedAt: string; // ISO timestamp
  active: boolean;
  notes?: string;
}

export type Watchlist = WatchlistEntry[];
