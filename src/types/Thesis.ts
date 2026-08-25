import { Direction } from '../constants/direction';

// What to actually do about the sentiment — kept distinct from `sentiment`
// itself for the same reason Alert.action is kept distinct from
// Alert.bias (see types/Alert.ts): a bearish sentiment doesn't always mean
// "short," it might mean "hold off" because this strategy doesn't take
// every bearish read as a short entry, or "hold" because an existing
// position's thesis hasn't actually broken yet.
export type Stance = 'long' | 'short' | 'hold';

// The market read for a symbol, at the time it was written — distinct
// from data/trade-ideas.json (a concrete, expiring entry/stop/target
// proposal) and data/alerts.json (a one-shot trigger). This is closer to
// a running commentary: what's the read right now, and why, written
// whenever it actually changes rather than on a timer. Append-only — a
// fresh write is a new entry, not an overwrite, so the history of how the
// read evolved for a symbol is kept, not discarded. The most recent entry
// per symbol (by `updatedAt`) is the current standing read; everything
// older is history.
export interface Thesis {
  id: string;
  symbol: string;
  sentiment: Direction;
  stance: Stance;
  summary: string; // one line — the headline read
  reasoning: string; // the fuller narrative behind it
  invalidation?: string; // what would change this read, if worth stating
  updatedAt: string; // ISO timestamp
}

export type Theses = Thesis[];
