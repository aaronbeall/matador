import { TimeInterval } from './Candlestick';

// The computed, mechanical analysis for one symbol — one block per
// maintained timeframe (1m/5m/15m/1h/1d/1w), each independently populated
// once that timeframe has enough cached bars. Computed server-side by the
// gap-reconciliation cache (vite-plugins/marketData/cache.ts) using the
// exact same math the live chart uses (src/utils/analysis.ts /
// src/utils/indicators.ts — single source of truth), and persisted to
// data/candles/<symbol>/analysis.json. find-trades reads it directly
// rather than re-deriving the same numbers a second way — see
// docs/trade-analysis-plan.md.
export interface TimeframeAnalysis {
  barCount: number;
  dataQuality: 'ok' | 'thin'; // 'thin' below ~30 bars — not enough for the slower indicators (MACD needs ~26+9) to be trustworthy yet
  lastTimestamp: number;
  close: number;
  // VWAP and opening range are single-trading-day concepts — only
  // populated on intraday timeframes (1m/5m/15m), and only from that
  // timeframe's own trading day, null everywhere else.
  vwap: number | null;
  priceVsVwapPct: number | null;
  ema9: number | null;
  ema21: number | null;
  emaTrend: 'up' | 'down' | null;
  sma20: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  atr14: number | null;
  candlePatterns: string[];
  // Intraday timeframes (1m/5m/15m): last 30 bars — a recent, tactical
  // read. Structural timeframes (1h/1d/1w): the full cached window — this
  // is where "market structure" actually lives (e.g. 1d's swingHigh over
  // up to 500 days is what used to be swingHighDaily).
  swingHigh: number;
  swingLow: number;
  // 1m only — the first 30 minutes of that day's candles. 5m/15m leave
  // this null rather than approximate it from a bar-count that wouldn't
  // actually span 30 minutes.
  openingRangeHigh: number | null;
  openingRangeLow: number | null;
  lastVolume: number;
  avgVolume20: number;
  volumeVsAvgPct: number | null;
}

export interface AnalysisSnapshot {
  symbol: string;
  computedAt: string; // ISO timestamp — staleness check for readers (see scan.mjs)
  timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>>;
}
