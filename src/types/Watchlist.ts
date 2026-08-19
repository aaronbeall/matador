export interface WatchlistEntry {
  symbol: string;
  addedAt: string; // ISO timestamp
  // Toggled directly from the Watchlist panel — off stops both
  // market-data caching/reconciliation for this symbol and find-trades
  // analysis of it (see vite-plugins/marketData/cache.ts's
  // readWatchlistSymbols and .claude/skills/find-trades/SKILL.md).
  active: boolean;
  notes?: string;
}

export type Watchlist = WatchlistEntry[];
