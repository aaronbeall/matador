import { Candlestick } from '../types/Candlestick';
import {
  vwap,
  ema,
  sma,
  MACD,
  RSI,
  ATR,
  bollingerbands,
  bullishengulfingpattern,
  bearishengulfingpattern,
  bullishhammerstick,
  bearishhammerstick,
  doji,
  morningstar,
  eveningstar,
  shootingstar,
} from 'technicalindicators';
import { MACDResult } from '../types/TechnicalIndicators';

// 'atr14'/'rvol'/'vwapBands' are configurable the same as every other
// indicator here even though none of them run through the generic
// per-indicator calculator below (see attachIndicators' special-casing) —
// atr14/rvol are attached directly in annotateTimeframe (src/utils/
// analysis.ts), vwapBands alongside vwap itself in attachDailyVWAP. Their
// math is always computed regardless of this list either way (see
// attachIndicators' doc comment) — this list, and the Indicator type
// itself, only ever gate what's *offered as a toggle in the UI*.
export type Indicator = 'vwap' | 'vwapBands' | 'ema9' | 'ema21' | 'sma20' | 'sma50' | 'sma200' | 'macd' | 'rsi' | 'atr14' | 'rvol' | 'bollingerBands';
export const ALL_INDICATORS: Indicator[] = ['vwap', 'vwapBands', 'ema9', 'ema21', 'sma20', 'sma50', 'sma200', 'macd', 'rsi', 'atr14', 'rvol', 'bollingerBands'];

export const calculateVWAP = (candles: Candlestick[]): number[] => {
  if (candles.length === 0) return [];
  return vwap({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    volume: candles.map(c => c.volume),
  })
};

export const calculateEMA = (candles: Candlestick[], period: number): number[] => {
  if (candles.length === 0) return [];
  return ema({ 
    period, 
    values: candles.map(c => c.close),
  })
};

export const calculateSMA = (candles: Candlestick[], period: number): number[] => {
  if (candles.length === 0) return [];
  return sma({
    period,
    values: candles.map(c => c.close)
  });
};

export const calculateMACD = (candles: Candlestick[]): MACDResult[] => {
  if (candles.length === 0) return [];
  
  const macdInput = {
    values: candles.map(c => c.close),
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  };

  const results = MACD.calculate(macdInput);
  const lastIndex = candles.length - 1;
  const getIndex = (i: number) => lastIndex - (results.length - 1 - i);
  
  return results.map((r, i) => ({ 
    macd: r.MACD ?? 0, 
    signal: r.signal ?? 0, 
    histogram: r.histogram ?? 0,
    timestamp: candles[lastIndex - (results.length - 1 - i)].timestamp
  }));
};

export const calculateRSI = (candles: Candlestick[], period: number = 14): number[] => {
  if (candles.length === 0) return [];

  return RSI.calculate({
    values: candles.map(c => c.close),
    period
  });
};

export const calculateATR = (candles: Candlestick[], period: number = 14): number[] => {
  if (candles.length === 0) return [];
  return ATR.calculate({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    period,
  });
};

// A candle's volume vs. the trailing `period`-bar average — flags
// abnormal-volume bars (breakouts/breakdowns with real participation vs.
// low-volume noise). Not time-of-day-matched against prior days the way a
// scanner's session RVOL is; a simpler rolling-average variant that fits
// this codebase's per-candle annotation model.
export const calculateRVOL = (candles: Candlestick[], period: number = 20): number[] => {
  if (candles.length === 0) return [];
  const avgVolume = sma({ period, values: candles.map(c => c.volume) });
  const offset = candles.length - avgVolume.length;
  return avgVolume.map((avg, i) => (avg > 0 ? candles[i + offset].volume / avg : 0));
};

export interface VWAPBand {
  vwap: number;
  upper1: number;
  lower1: number;
  upper2: number;
  lower2: number;
}

// VWAP plus its volume-weighted standard-deviation bands (±1σ/±2σ) — the
// same cumulative-VWAP math already in calculateVWAP, extended to also
// accumulate volume-weighted variance of typical price around it. Callers
// that need day-aware bands (VWAP resets each session) must pass in a
// single day's candles, same requirement as calculateVWAP itself.
export const calculateVWAPBands = (candles: Candlestick[]): VWAPBand[] => {
  if (candles.length === 0) return [];
  const vwapSeries = calculateVWAP(candles);
  let cumVolume = 0;
  let cumVolumeVariance = 0;
  return candles.map((c, i) => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumVolume += c.volume;
    const diff = typicalPrice - vwapSeries[i];
    cumVolumeVariance += c.volume * diff * diff;
    const stdDev = cumVolume > 0 ? Math.sqrt(cumVolumeVariance / cumVolume) : 0;
    return {
      vwap: vwapSeries[i],
      upper1: vwapSeries[i] + stdDev,
      lower1: vwapSeries[i] - stdDev,
      upper2: vwapSeries[i] + 2 * stdDev,
      lower2: vwapSeries[i] - 2 * stdDev,
    };
  });
};

export interface BollingerBand {
  middle: number;
  upper: number;
  lower: number;
}

// Standard 20-period/±2σ bands around a simple moving average of close —
// unlike VWAP bands (calculateVWAPBands above), this isn't day-scoped: it's
// a plain rolling window over whatever series is passed in, so it works the
// same way on any timeframe (including 1d/1w, where VWAP bands don't apply
// at all since there's no intraday session to reset each day). This is the
// "is price stretched from fair value" reference for swing/any-timeframe
// reads; VWAP bands stay the intraday-specific one.
export const calculateBollingerBands = (candles: Candlestick[], period: number = 20, stdDev: number = 2): BollingerBand[] => {
  if (candles.length === 0) return [];
  return bollingerbands({
    period,
    stdDev,
    values: candles.map(c => c.close),
  }).map((r) => ({ middle: r.middle, upper: r.upper, lower: r.lower }));
};

// Recognized on the most recent bars only (each checker looks at the tail
// of whatever's passed in) — treat as a confirmation signal alongside a
// level or trend read, never as a standalone trade trigger.
const CANDLE_PATTERN_CHECKERS: Record<string, (input: {
  open: number[]; high: number[]; low: number[]; close: number[];
}) => boolean> = {
  'bullish-engulfing': bullishengulfingpattern,
  'bearish-engulfing': bearishengulfingpattern,
  'bullish-hammer': bullishhammerstick,
  'bearish-hammer': bearishhammerstick,
  doji,
  'morning-star': morningstar,
  'evening-star': eveningstar,
  'shooting-star': shootingstar,
};

export const detectCandlePatterns = (candles: Candlestick[]): string[] => {
  const window = candles.slice(-10);
  if (window.length === 0) return [];
  const input = {
    open: window.map(c => c.open),
    high: window.map(c => c.high),
    low: window.map(c => c.low),
    close: window.map(c => c.close),
  };
  return Object.entries(CANDLE_PATTERN_CHECKERS)
    .filter(([, check]) => {
      try {
        return check(input);
      } catch {
        return false;
      }
    })
    .map(([name]) => name);
};

// Same pattern checks as detectCandlePatterns, but tags every candle with
// whatever matched in the 10-bar window ending there, instead of checking
// only the single most recent window. This is what lets the annotated
// history (src/utils/analysis.ts) show a pattern in its actual place in
// the sequence — e.g. "a doji three bars before this level broke" — rather
// than only ever knowing about the most recent one.
export const attachCandlePatterns = (candles: Candlestick[]): Candlestick[] => {
  return candles.map((candle, i) => {
    const window = candles.slice(Math.max(0, i - 9), i + 1);
    return { ...candle, patterns: detectCandlePatterns(window) };
  });
};

// 'macd'/'vwap'/'vwapBands'/'atr14'/'rvol'/'bollingerBands' are deliberately
// absent — each is computed and attached through its own dedicated path
// (see attachIndicators' and annotateTimeframe's special-casing) rather
// than this generic single-series-per-indicator mechanism, which only fits
// indicators that produce exactly one number per candle from close price
// alone.
const indicatorCalculators: Record<Exclude<Indicator, 'macd' | 'vwap' | 'vwapBands' | 'atr14' | 'rvol' | 'bollingerBands'>, (candles: Candlestick[]) => number[]> = {
  ema9: (candles) => calculateEMA(candles, 9),
  ema21: (candles) => calculateEMA(candles, 21),
  sma20: (candles) => calculateSMA(candles, 20),
  sma50: (candles) => calculateSMA(candles, 50),
  sma200: (candles) => calculateSMA(candles, 200),
  rsi: (candles) => calculateRSI(candles),
};

// Attaches per-candle indicator series onto each candle object (matching
// Candlestick's optional indicator fields), rather than returning a
// separate series. This is the single place that math runs: Node (the
// market data service) computes it once per trade and pushes the result
// to the browser, which just renders the fields — it doesn't recompute
// them. See vite-plugins/marketData/service.ts and
// docs/trade-analysis-plan.md.
//
// Returns fresh candle objects rather than mutating the input array's
// elements — `[...candles]` alone only copies the array, not each element,
// so writing `candlesWithIndicators[i][indicator] = value` used to mutate
// whatever candle objects were passed in. That leaked into CandleStore's
// own live 1m buckets (getCandles('1m') hands out its real object
// references), which is why persisted 1m.json candles could end up with
// indicator fields stuck on them that were never supposed to be there.
export const attachIndicators = (
  candles: Candlestick[],
  wantedIndicators: Indicator[] = ALL_INDICATORS
): Candlestick[] => {
  if (candles.length === 0) return candles;

  return wantedIndicators.reduce((candlesWithIndicators, indicator) => {
    if (indicator === 'macd') {
      const macdValues = calculateMACD(candles);
      const offset = candlesWithIndicators.length - macdValues.length;
      macdValues.forEach(({ macd, signal, histogram }, i) => {
        candlesWithIndicators[i + offset].macd = macd;
        candlesWithIndicators[i + offset].signal = signal;
        candlesWithIndicators[i + offset].histogram = histogram;
      });
    } else if (indicator === 'bollingerBands') {
      const bandValues = calculateBollingerBands(candles);
      const offset = candlesWithIndicators.length - bandValues.length;
      bandValues.forEach(({ middle, upper, lower }, i) => {
        candlesWithIndicators[i + offset].bollingerMiddle = middle;
        candlesWithIndicators[i + offset].bollingerUpper = upper;
        candlesWithIndicators[i + offset].bollingerLower = lower;
      });
    } else if (indicator === 'vwap' || indicator === 'vwapBands' || indicator === 'atr14' || indicator === 'rvol') {
      // No-op here — each is computed and attached by annotateTimeframe/
      // attachDailyVWAP directly (see the comment on indicatorCalculators
      // above). Only reachable if some future caller passes the default
      // wantedIndicators=ALL_INDICATORS instead of the filtered list
      // annotateTimeframe actually uses.
    } else {
      const values = indicatorCalculators[indicator](candles);
      const offset = candlesWithIndicators.length - values.length;
      values.forEach((value, i) => {
        candlesWithIndicators[i + offset][indicator] = value;
      });
    }

    return candlesWithIndicators;
  }, candles.map((c) => ({ ...c })));
};

// Bars on each side a candle's high/low must beat to count as a confirmed
// swing pivot — a standard fractal-style pivot, not a stored indicator, so
// it only needs a lookback+lookahead window, no warm-up period like EMA/SMA.
const SWING_WINDOW = 3;

const findSwingHighs = (candles: Candlestick[]): number[] => {
  const idxs: number[] = [];
  for (let i = SWING_WINDOW; i < candles.length - SWING_WINDOW; i++) {
    const window = candles.slice(i - SWING_WINDOW, i + SWING_WINDOW + 1);
    if (candles[i].high === Math.max(...window.map((c) => c.high))) idxs.push(i);
  }
  return idxs;
};

const findSwingLows = (candles: Candlestick[]): number[] => {
  const idxs: number[] = [];
  for (let i = SWING_WINDOW; i < candles.length - SWING_WINDOW; i++) {
    const window = candles.slice(i - SWING_WINDOW, i + SWING_WINDOW + 1);
    if (candles[i].low === Math.min(...window.map((c) => c.low))) idxs.push(i);
  }
  return idxs;
};

// Regular RSI divergence, v1 scope (per the approved signals plan): price
// and RSI disagreeing at consecutive confirmed swings — price makes a
// higher high while RSI's matching swing is lower (bearish), or price makes
// a lower low while RSI's matching swing is higher (bullish). Reuses the
// existing pattern pipeline wholesale rather than being its own overlay:
// tags the confirming candle's `patterns` array with
// 'bullish-divergence-rsi'/'bearish-divergence-rsi' (see PATTERN_INFO),
// which is what lets the Scatter/tooltip/badges/settings-checkbox/
// find-trades-table machinery already built for candlestick patterns pick
// these up for free. Must run after RSI (attachIndicators) and after
// attachCandlePatterns, since it appends onto whatever `patterns` already
// tagged rather than replacing it.
//
// Also records which earlier swing each tag is being compared against
// (bullishDivergencePartner/bearishDivergencePartner, the partner candle's
// timestamp) — not needed for the tag/tooltip pipeline itself, but is what
// lets the chart draw an actual connector line between the two swing
// points instead of just marking the later one. Computed once here rather
// than re-derived client-side, same "server computes once, browser only
// renders" principle as everything else in this file.
export const attachDivergence = (candles: Candlestick[]): Candlestick[] => {
  if (candles.length < SWING_WINDOW * 2 + 2) return candles;

  const tags = new Map<number, string[]>();
  const bullishPartner = new Map<number, number>();
  const bearishPartner = new Map<number, number>();
  const addTag = (index: number, tag: string) => {
    tags.set(index, [...(tags.get(index) ?? []), tag]);
  };

  const swingHighs = findSwingHighs(candles);
  for (let k = 1; k < swingHighs.length; k++) {
    const i = swingHighs[k - 1];
    const j = swingHighs[k];
    const rsiI = candles[i].rsi;
    const rsiJ = candles[j].rsi;
    if (rsiI == null || rsiJ == null) continue;
    if (candles[j].high > candles[i].high && rsiJ < rsiI) {
      addTag(j, 'bearish-divergence-rsi');
      bearishPartner.set(j, candles[i].timestamp);
    }
  }

  const swingLows = findSwingLows(candles);
  for (let k = 1; k < swingLows.length; k++) {
    const i = swingLows[k - 1];
    const j = swingLows[k];
    const rsiI = candles[i].rsi;
    const rsiJ = candles[j].rsi;
    if (rsiI == null || rsiJ == null) continue;
    if (candles[j].low < candles[i].low && rsiJ > rsiI) {
      addTag(j, 'bullish-divergence-rsi');
      bullishPartner.set(j, candles[i].timestamp);
    }
  }

  if (tags.size === 0) return candles;
  return candles.map((c, i) => {
    const extra = tags.get(i);
    if (!extra) return c;
    return {
      ...c,
      patterns: [...(c.patterns ?? []), ...extra],
      ...(bullishPartner.has(i) ? { bullishDivergencePartner: bullishPartner.get(i) } : {}),
      ...(bearishPartner.has(i) ? { bearishDivergencePartner: bearishPartner.get(i) } : {}),
    };
  });
};