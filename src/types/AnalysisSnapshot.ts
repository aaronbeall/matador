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
// field (a swing high, a trend label, a level). That's the read-time job —
// rendered as data/candles/<symbol>/analysis.md (see
// src/utils/analysis.ts's renderAnalysisMarkdown) for find-trades to read
// like a chart, not a pre-decided verdict to trust. See
// docs/trade-analysis-plan.md.
export interface TimeframeAnalysis {
  barCount: number;
  dataQuality: 'ok' | 'thin'; // 'thin' below ~30 bars — not enough for the slower indicators (MACD needs ~26+9) to be trustworthy yet
  candles: Candlestick[];
}

export interface AnalysisSnapshot {
  symbol: string;
  computedAt: string; // ISO timestamp — staleness check for readers (see scan.mjs)
  timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>>;
}
