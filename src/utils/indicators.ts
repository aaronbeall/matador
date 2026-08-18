import { Candlestick } from '../types/Candlestick';
import {
  vwap,
  ema,
  sma,
  MACD,
  RSI,
  ATR,
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

export type Indicator = 'vwap' | 'ema9' | 'ema21' | 'sma20' | 'sma50' | 'sma200' | 'macd' | 'rsi';
export const ALL_INDICATORS: Indicator[] = ['vwap', 'ema9', 'ema21', 'sma20', 'sma50', 'sma200', 'macd', 'rsi'];

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

const indicatorCalculators: Record<Indicator, (candles: Candlestick[]) => number[]> = {
  vwap: calculateVWAP,
  ema9: (candles) => calculateEMA(candles, 9),
  ema21: (candles) => calculateEMA(candles, 21),
  sma20: (candles) => calculateSMA(candles, 20),
  sma50: (candles) => calculateSMA(candles, 50),
  sma200: (candles) => calculateSMA(candles, 200),
  macd: (candles) => calculateMACD(candles).map(v => v.macd),
  rsi: (candles) => calculateRSI(candles),
};

// Attaches per-candle indicator series onto each candle object (matching
// Candlestick's optional indicator fields), rather than returning a
// separate series. This is the single place that math runs: Node (the
// market data service) computes it once per trade and pushes the result
// to the browser, which just renders the fields — it doesn't recompute
// them. See vite-plugins/marketData/service.ts and
// docs/trade-analysis-plan.md.
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
    } else {
      const values = indicatorCalculators[indicator](candles);
      const offset = candlesWithIndicators.length - values.length;
      values.forEach((value, i) => {
        candlesWithIndicators[i + offset][indicator] = value;
      });
    }

    return candlesWithIndicators;
  }, [...candles]);
};