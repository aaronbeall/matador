import { Candlestick } from '../types/Candlestick';
import { Direction } from '../constants/direction';
import { findSwingHighs, findSwingLows } from './indicators';

export type TrendState = 'uptrend' | 'downtrend' | 'range';

export interface SwingPoint {
  index: number;
  timestamp: number;
  price: number;
}

// A real, lookback-based trend read off the confirmed swing-pivot
// sequence — higher-highs+higher-lows (HH/HL) is an uptrend, lower-highs+
// lower-lows (LH/LL) is a downtrend, anything else (mixed signals, or not
// enough pivots yet) is a range/no-read. This is deliberately separate from
// the isUptrend/isDowntrend EMA9-vs-EMA21 gate used elsewhere in this file
// [ed: see indicators.ts] to filter hidden divergence — that gate is
// explicitly disclaimed there as "not a rigorous trend classification (no
// lookback, no higher-high/higher-low read)" and stays exactly as-is for
// its one narrow purpose. This supersedes nothing; it's a separate,
// richer classifier for a separate, user-facing purpose (the Market
// Structure signal + the trend chip in the OHLCV legend).
export interface StructureRead {
  trend: TrendState;
  lastSwingHigh: SwingPoint | null;
  lastSwingLow: SwingPoint | null;
  priorSwingHigh: SwingPoint | null;
  priorSwingLow: SwingPoint | null;
}

const NO_STRUCTURE: StructureRead = {
  trend: 'range',
  lastSwingHigh: null,
  lastSwingLow: null,
  priorSwingHigh: null,
  priorSwingLow: null,
};

function toSwingPoints(candles: Candlestick[], indices: number[], field: 'high' | 'low'): SwingPoint[] {
  return indices.map((i) => ({ index: i, timestamp: candles[i].timestamp, price: candles[i][field] }));
}

// Classifies the whole visible window in one shot — the read shown in the
// OHLCV legend's trend chip. Reuses findSwingHighs/findSwingLows (the same
// pivots the swing-high/swing-low signal markers already plot) rather than
// recomputing pivots a second way.
export function classifyStructure(candles: Candlestick[]): StructureRead {
  const highs = toSwingPoints(candles, findSwingHighs(candles), 'high');
  const lows = toSwingPoints(candles, findSwingLows(candles), 'low');
  if (highs.length < 2 || lows.length < 2) return NO_STRUCTURE;

  const lastSwingHigh = highs[highs.length - 1];
  const priorSwingHigh = highs[highs.length - 2];
  const lastSwingLow = lows[lows.length - 1];
  const priorSwingLow = lows[lows.length - 2];

  const risingHighs = lastSwingHigh.price > priorSwingHigh.price;
  const risingLows = lastSwingLow.price > priorSwingLow.price;
  const fallingHighs = lastSwingHigh.price < priorSwingHigh.price;
  const fallingLows = lastSwingLow.price < priorSwingLow.price;

  const trend: TrendState = risingHighs && risingLows ? 'uptrend' : fallingHighs && fallingLows ? 'downtrend' : 'range';

  return { trend, lastSwingHigh, priorSwingHigh, lastSwingLow, priorSwingLow };
}

// Break of Structure (continuation) vs. Change of Character (first
// reversal warning) — the standard price-action vocabulary for "price
// closed past the swing point that was defining the current structure."
export interface StructureBreak {
  index: number;
  timestamp: number;
  kind: 'bos' | 'choch';
  direction: Direction;
  brokenLevel: number;
  brokenLevelTimestamp: number;
}

// A single forward pass, not a per-candle re-classification (that would be
// O(n^2) re-scanning findSwingHighs/findSwingLows at every candle). Walks
// chronologically, tracking the swing high/low and trend state as they
// were actually known AT that point in history — a break is evaluated
// against what preceded it, not hindsight — and marks each broken level
// "used" so a level that stays broken doesn't refire every candle after.
export function detectStructureBreaks(candles: Candlestick[]): StructureBreak[] {
  const highIdxSet = new Set(findSwingHighs(candles));
  const lowIdxSet = new Set(findSwingLows(candles));

  const breaks: StructureBreak[] = [];
  let lastHigh: SwingPoint | null = null;
  let priorHigh: SwingPoint | null = null;
  let lastLow: SwingPoint | null = null;
  let priorLow: SwingPoint | null = null;
  let trend: TrendState = 'range';
  let highBroken = false;
  let lowBroken = false;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];

    // A confirmed break resets which level is "live" to watch next, so the
    // level that just broke can't refire, and a fresh swing on the broken
    // side re-arms future breaks against it.
    if (lastHigh && !highBroken && c.close > lastHigh.price) {
      breaks.push({
        index: i,
        timestamp: c.timestamp,
        kind: trend === 'uptrend' ? 'bos' : 'choch',
        direction: 'bullish',
        brokenLevel: lastHigh.price,
        brokenLevelTimestamp: lastHigh.timestamp,
      });
      highBroken = true;
    }
    if (lastLow && !lowBroken && c.close < lastLow.price) {
      breaks.push({
        index: i,
        timestamp: c.timestamp,
        kind: trend === 'downtrend' ? 'bos' : 'choch',
        direction: 'bearish',
        brokenLevel: lastLow.price,
        brokenLevelTimestamp: lastLow.timestamp,
      });
      lowBroken = true;
    }

    // Pivots only confirm SWING_WINDOW bars after the fact (see
    // findSwingHighs/findSwingLows), which is exactly when this loop
    // reaches that index — a pivot never gets used before it could
    // actually have been known.
    if (highIdxSet.has(i)) {
      priorHigh = lastHigh;
      lastHigh = { index: i, timestamp: c.timestamp, price: c.high };
      highBroken = false;
    }
    if (lowIdxSet.has(i)) {
      priorLow = lastLow;
      lastLow = { index: i, timestamp: c.timestamp, price: c.low };
      lowBroken = false;
    }

    if (lastHigh && priorHigh && lastLow && priorLow) {
      const risingHighs = lastHigh.price > priorHigh.price;
      const risingLows = lastLow.price > priorLow.price;
      const fallingHighs = lastHigh.price < priorHigh.price;
      const fallingLows = lastLow.price < priorLow.price;
      trend = risingHighs && risingLows ? 'uptrend' : fallingHighs && fallingLows ? 'downtrend' : 'range';
    }
  }

  return breaks;
}
