import { Candlestick, TimeInterval } from '../types/Candlestick';
import { AnalysisSnapshot, TimeframeAnalysis } from '../types/AnalysisSnapshot';
import {
  calculateVWAP,
  calculateEMA,
  calculateSMA,
  calculateMACD,
  calculateRSI,
  calculateATR,
  detectCandlePatterns,
} from './indicators';

const FULL_CONFIDENCE_BARS = 30; // enough for all indicators (MACD needs the most: ~26+9)
const INTRADAY_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m'];
const ALL_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m', '1h', '1d', '1w'];

const last = <T,>(arr: T[]): T | null => (arr.length ? arr[arr.length - 1] : null);

// Candles from the same local calendar day as the most recent candle in
// the array — used to scope VWAP and the opening range to "today," since
// both are single-trading-day concepts that go wrong if computed over a
// multi-day buffer.
function todaysCandles(candles: Candlestick[]): Candlestick[] {
  if (!candles.length) return [];
  const lastDateKey = new Date(candles[candles.length - 1].timestamp).toLocaleDateString('en-CA');
  return candles.filter((c) => new Date(c.timestamp).toLocaleDateString('en-CA') === lastDateKey);
}

function computeTimeframeAnalysis(
  candles: Candlestick[],
  opts: { intraday: boolean; openingRange: boolean }
): TimeframeAnalysis | null {
  if (candles.length === 0) return null;

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const vwapSeries = opts.intraday ? calculateVWAP(todaysCandles(candles)) : [];
  const ema9Series = calculateEMA(candles, 9);
  const ema21Series = calculateEMA(candles, 21);
  const sma20Series = calculateSMA(candles, 20);
  const rsi14Series = calculateRSI(candles, 14);
  const macdSeries = calculateMACD(candles);
  const atrSeries = calculateATR(candles, 14);

  const lastClose = last(closes)!;
  const lastVwap = opts.intraday ? last(vwapSeries) : null;
  const lastEma9 = last(ema9Series);
  const lastEma21 = last(ema21Series);
  const lastVolume = last(volumes)!;
  const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);

  // Recent tactical read on fast timeframes; the full cached window on
  // structural ones (1h/1d/1w) — that full window IS the market
  // structure these timeframes exist to carry.
  const swingWindow = opts.intraday ? candles.slice(-30) : candles;
  const swingHigh = Math.max(...swingWindow.map((c) => c.high));
  const swingLow = Math.min(...swingWindow.map((c) => c.low));

  let openingRangeHigh: number | null = null;
  let openingRangeLow: number | null = null;
  if (opts.openingRange) {
    const openRange = todaysCandles(candles).slice(0, 30);
    if (openRange.length) {
      openingRangeHigh = Math.max(...openRange.map((c) => c.high));
      openingRangeLow = Math.min(...openRange.map((c) => c.low));
    }
  }

  return {
    barCount: candles.length,
    dataQuality: candles.length >= FULL_CONFIDENCE_BARS ? 'ok' : 'thin',
    lastTimestamp: candles[candles.length - 1].timestamp,
    close: lastClose,
    vwap: lastVwap,
    priceVsVwapPct: lastVwap ? ((lastClose - lastVwap) / lastVwap) * 100 : null,
    ema9: lastEma9,
    ema21: lastEma21,
    emaTrend: lastEma9 != null && lastEma21 != null ? (lastEma9 > lastEma21 ? 'up' : 'down') : null,
    sma20: last(sma20Series),
    rsi14: last(rsi14Series),
    macd: last(macdSeries),
    atr14: last(atrSeries),
    candlePatterns: detectCandlePatterns(candles),
    swingHigh,
    swingLow,
    openingRangeHigh,
    openingRangeLow,
    lastVolume,
    avgVolume20,
    volumeVsAvgPct: avgVolume20 ? ((lastVolume - avgVolume20) / avgVolume20) * 100 : null,
  };
}

// Computes the same mechanical analysis find-trades reads instead of
// re-deriving itself (scan.mjs) — one block per timeframe that has any
// cached candles, using the same indicator math the chart itself uses
// (src/utils/indicators.ts), so it can never drift from what's on screen.
// Called from the gap-reconciliation cache (vite-plugins/marketData/
// cache.ts) whenever any timeframe's candles change.
export function computeAnalysisSnapshot(
  symbol: string,
  candlesByTimeframe: Partial<Record<TimeInterval, Candlestick[]>>
): AnalysisSnapshot | null {
  const timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>> = {};

  for (const tf of ALL_TIMEFRAMES) {
    const candles = candlesByTimeframe[tf];
    if (!candles?.length) continue;
    const block = computeTimeframeAnalysis(candles, {
      intraday: INTRADAY_TIMEFRAMES.includes(tf),
      openingRange: tf === '1m',
    });
    if (block) timeframes[tf] = block;
  }

  if (Object.keys(timeframes).length === 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    computedAt: new Date().toISOString(),
    timeframes,
  };
}
