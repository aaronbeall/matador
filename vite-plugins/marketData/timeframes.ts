import type { TimeInterval } from '../../src/types/Candlestick';

export interface TimeframeConfig {
  interval: TimeInterval;
  alpaca: string; // Alpaca's `timeframe` query param value
  intervalMs: number;
  lookbackDays: number;
  // Whether VWAP / opening-range make sense at this resolution — both are
  // single-trading-day concepts, meaningless once a bar spans multiple
  // sessions (1h+).
  intraday: boolean;
}

// The one place lookback depth per timeframe is decided. Reasoned as a
// trader would: fast timeframes are for execution/recency (today's tape
// is what matters, older 1m/5m data is noise), slow timeframes carry
// actual market structure (swing points, major S/R) and need real depth
// to mean anything. See docs/trade-analysis-plan.md for the full
// reasoning behind each row.
export const TIMEFRAMES: TimeframeConfig[] = [
  { interval: '1m', alpaca: '1Min', intervalMs: 60_000, lookbackDays: 2, intraday: true },
  { interval: '5m', alpaca: '5Min', intervalMs: 300_000, lookbackDays: 5, intraday: true },
  { interval: '15m', alpaca: '15Min', intervalMs: 900_000, lookbackDays: 10, intraday: true },
  { interval: '1h', alpaca: '1Hour', intervalMs: 3_600_000, lookbackDays: 90, intraday: false },
  { interval: '1d', alpaca: '1Day', intervalMs: 86_400_000, lookbackDays: 500, intraday: false },
  { interval: '1w', alpaca: '1Week', intervalMs: 604_800_000, lookbackDays: 730, intraday: false },
];
