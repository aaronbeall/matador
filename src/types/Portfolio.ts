// The one place that reflects only real account state — actual open/closed
// positions and actual cash. Distinct from data/journal.json (freeform
// notes plus Claude's own self-graded reviews of past calls — narrative,
// not state) and from data/thesis.json / data/trade-ideas.json (analysis
// and proposals, not what's actually happened). Nothing analytical,
// speculative, or plan-shaped belongs here — see CLAUDE.md. The point of
// this file is that reading it alone answers "what do I actually hold and
// how much cash do I have," with zero editorializing mixed in.

export type PositionDirection = 'long' | 'short';
export type PositionInstrument = 'shares' | 'call' | 'put';
export type PositionStatus = 'open' | 'closed';

export interface Position {
  id: string;
  account?: string; // which account this is held in, once tracking more than one
  symbol: string;
  direction: PositionDirection;
  instrument: PositionInstrument;
  strike?: number;
  expiry?: string; // ISO date, options only
  quantity: number; // shares, or option contracts
  entryPrice: number;
  entryAt: string; // ISO
  exitPrice?: number;
  exitAt?: string; // ISO
  status: PositionStatus;
  realizedPL?: number; // set once closed, if known — a plain number, not recomputed by the UI
  notes?: string; // a short earmark/description — not analysis or a plan
  relatedIdeaId?: string; // links back to a trade-ideas.json entry, if this came from one
}

export type Positions = Position[];

// One entry per account — a fresh write replaces the matching account's
// entry (by `account`), same overwrite convention as Thesis per symbol.
// This is a snapshot of the current figure, not a balance history.
export interface AccountBalance {
  account: string; // free-text label, e.g. "Schwab Individual" — also the key
  cash: number;
  asOf: string; // ISO — when this figure was last confirmed
  notes?: string;
}

export type AccountBalances = AccountBalance[];
