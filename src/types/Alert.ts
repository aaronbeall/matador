import { TimeInterval } from './Candlestick';
import { Direction } from '../constants/direction';

// What this alert actually says to DO — distinct from `bias` (the
// directional read itself). A bearish read doesn't automatically mean
// "short": it might just mean "stand aside" (no short in the strategy for
// this setup) or "exit" (invalidating a long already taken). Claude sets
// this deliberately per alert, not derived mechanically from bias.
export type AlertAction = 'long' | 'short' | 'exit' | 'watch';

// The technical trigger — evaluated server-side against the annotated
// candle history (vite-plugins/marketData/alertsEngine.ts) whenever it's
// recomputed (live ~10s while a symbol's on screen, every 5 min in the
// background otherwise — see src/utils/analysis.ts). Edge-triggered: fires
// once on the transition into true, not on every tick it stays true.
// Deliberately no compound AND/OR conditions — Claude expresses
// multi-timeframe confluence in `rationale` below; the trigger itself is
// one concrete, checkable thing.
export type AlertCondition =
  | { kind: 'price-crosses'; timeframe: TimeInterval; level: number; direction: 'above' | 'below' }
  | {
      kind: 'indicator-crosses';
      timeframe: TimeInterval;
      fast: 'ema9' | 'ema21' | 'sma20';
      slow: 'ema9' | 'ema21' | 'sma20';
      direction: 'bullish' | 'bearish';
    }
  | { kind: 'macd-crosses-signal'; timeframe: TimeInterval; direction: 'bullish' | 'bearish' }
  | { kind: 'indicator-threshold'; timeframe: TimeInterval; indicator: 'rsi14' | 'atr14'; comparator: 'above' | 'below'; value: number };

export type AlertSeverity = 'watch' | 'action';

// 'pending' — a condition Claude wrote, not yet true; the engine watches it.
// 'triggered' — either the engine just detected the condition became true,
//   or Claude wrote it already-true at scan time (e.g. "new idea created").
// 'invalidated' — the engine detected `invalidation` became true first —
//   the competing scenario won, so this alert resolves without its own
//   condition ever firing. Automatic and live, unlike 'superseded' below.
// 'superseded' — Claude decided on a later scan this no longer applies
//   (setup invalidated, replaced by a fresher read) — distinct from
//   'invalidated' (the engine resolved it live, off a real condition) and
//   from 'expired' (nobody decided anything, expiresAt just passed) so the
//   UI can explain *why* it's no longer live, though all three dim the same.
export type AlertStatus = 'pending' | 'triggered' | 'invalidated' | 'superseded' | 'expired';

// A concrete, ready-to-act-on trade expression for an alert's `action` —
// not just "go long," but what to actually put on: which instrument, what
// strike/expiry if it's an option, and the entry/stop/target the rest of
// strategy.md's exit rules apply to. `entry`/`stop`/`target` are always the
// underlying's price levels (this app has no live options-chain data to
// price a premium from) — for an option, size/strike are chosen to
// express that same underlying move, not a separately-priced target.
// `target` is omitted when no structural level actually supports one yet
// (e.g. breaking into open air below recent lows) — never fabricate one
// just to fill the field; say so in `note` instead and manage via a trail.
export interface TradeSuggestion {
  instrument: 'shares' | 'call' | 'put';
  strike?: number; // options only
  expiry?: string; // ISO date, options only
  entry: number;
  stop: number;
  target?: number;
  riskReward?: number; // omitted along with target when there isn't one yet
  note?: string; // one short qualifier if genuinely needed — not a restated rationale
}

export interface Alert {
  id: string;
  symbol: string;
  severity: AlertSeverity;
  status: AlertStatus;
  condition: AlertCondition; // the technical trigger — see AlertsPanel's expandable detail view
  // The competing scenario that resolves this alert without its own
  // condition firing — evaluated by the same engine, the same way, every
  // pass. The natural choice is "the other side of the same setup" (e.g.
  // a bearish breakdown alert invalidated by the bullish reclaim level
  // that would contradict it) so a stale alert doesn't just sit there
  // once the market has clearly gone the other way. Optional — not every
  // alert has a clean opposite condition to point at.
  invalidation?: AlertCondition;
  bias: Direction; // the directional read this alert represents
  action: AlertAction; // what to actually do about it — see AlertAction
  // At least one concrete expression of `action`, required whenever action
  // isn't 'watch' — more than one (e.g. a shares alternative alongside an
  // options one) when genuinely applicable. See TradeSuggestion.
  suggestions?: TradeSuggestion[];
  headline: string; // succinct, notification-ready: "QQQ broke above $730.50 resistance"
  rationale: string; // why this matters
  actionGuidance: string; // what to do / watch for next
  relatedIdeaId?: string;
  relatedLevelId?: string;
  createdAt: string; // ISO timestamp
  triggeredAt?: string; // ISO timestamp — set when status becomes 'triggered'
  invalidatedAt?: string; // ISO timestamp — set when status becomes 'invalidated'
  // The condition's valid window: not evaluated before activeFrom (defaults
  // to createdAt — i.e. active immediately — if omitted), auto-expires
  // after expiresAt regardless of whether it ever fired. Time-boxing a
  // signal that's only meaningful in a specific window — an ORB breakout
  // is the case that motivated this: set activeFrom to when the opening
  // range closes (so an early, pre-range price wiggle can't false-trigger
  // it) and expiresAt to how long after that a break still counts as *the*
  // ORB signal rather than an unrelated late-day level cross.
  activeFrom?: string; // ISO timestamp
  expiresAt: string; // ISO timestamp — required; inherit the related idea's, or set one deliberately
  acknowledged: boolean;
}

export type Alerts = Alert[];
