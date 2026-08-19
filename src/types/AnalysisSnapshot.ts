import { Candlestick, TimeInterval } from './Candlestick';

// The full annotated candle history for one symbol — one block per
// maintained timeframe (1m/5m/15m/1h/1d/1w), each populated once that
// timeframe has any cached bars. Every candle carries whatever's
// deterministic (EMA9/21, SMA20/50/200, RSI14, MACD, ATR14, VWAP where
// intraday, detected candlestick patterns) computed server-side by the
// gap-reconciliation cache (vite-plugins/marketData/cache.ts), using the
// same math the live chart uses (src/utils/analysis.ts /
// src/utils/indicators.ts — single source of truth).
//
// Deliberately NOT included: any collapsed "current value" or judgment
// field (a swing high, a trend label, a level). That's the read-time job.
// This type itself is assembled in memory (cache.ts's recomputeAnalysis)
// from whatever's persisted across each timeframe's period files —
// data/candles/<symbol>/<interval>/<period>.json (day/week/month, see
// src/utils/analysis.ts's periodKeyFor) — and consumed by the alerts
// engine; find-trades reads the persisted per-period `.md` files and the
// small cross-timeframe `latest.md` directly, not this in-memory shape.
// See docs/trade-analysis-plan.md.
export interface TimeframeAnalysis {
  barCount: number;
  dataQuality: 'ok' | 'thin'; // 'thin' below ~30 bars — not enough for the slower indicators (MACD needs ~26+9) to be trustworthy yet
  candles: Candlestick[];
}

export interface AnalysisSnapshot {
  symbol: string;
  computedAt: string; // ISO timestamp
  timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>>;
}
