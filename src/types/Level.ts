export type LevelType = 'support' | 'resistance';

export interface Level {
  id: string;
  symbol: string;
  type: LevelType;
  price: number;
  label: string; // e.g. "opening range high", "30-bar swing low", "VWAP"
  source: string; // what produced it, e.g. "find-trades" or a symbol/timeframe note
  createdAt: string; // ISO timestamp
  active: boolean; // false once no longer relevant (broken, stale, superseded)
}

export type Levels = Level[];
