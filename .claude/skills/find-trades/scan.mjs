#!/usr/bin/env node
// Computes a compact indicator snapshot for one symbol from its persisted
// candle history (data/candles/<SYMBOL>.json — real candles accumulated
// from the app's live WebSocket feed, written by vite-plugins/localDataApi.ts).
//
// This intentionally does ONLY deterministic numeric feature extraction —
// it does not judge whether a setup qualifies. That evaluation against
// data/strategy.md's rules is done by whoever invokes this (the find-trades
// skill), reading the JSON this prints to stdout. See docs/trade-analysis-plan.md
// and the "how well does raw numeric data work" discussion it's based on.
//
// Usage: node scan.mjs <SYMBOL>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { vwap, ema, sma, MACD, RSI } from 'technicalindicators';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CANDLES_DIR = path.join(REPO_ROOT, 'data', 'candles');

const symbol = process.argv[2];
if (!symbol) {
  console.error('Usage: node scan.mjs <SYMBOL>');
  process.exit(1);
}

const filePath = path.join(CANDLES_DIR, `${symbol.toUpperCase()}.json`);

function output(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

if (!fs.existsSync(filePath)) {
  output({
    symbol: symbol.toUpperCase(),
    error: 'no persisted candle data — open the app, enable Live, and let it stream for a while first',
  });
  process.exit(0);
}

const candles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const MIN_BARS = 2;
const FULL_CONFIDENCE_BARS = 30; // enough for all indicators (MACD needs the most: ~26+9)
if (candles.length < MIN_BARS) {
  output({
    symbol: symbol.toUpperCase(),
    error: `insufficient candle history (${candles.length} bars, need ${MIN_BARS}+)`,
    barCount: candles.length,
  });
  process.exit(0);
}

const closes = candles.map((c) => c.close);
const highs = candles.map((c) => c.high);
const lows = candles.map((c) => c.low);
const volumes = candles.map((c) => c.volume);
const last = (arr) => (arr.length ? arr[arr.length - 1] : null);

const vwapSeries = vwap({ high: highs, low: lows, close: closes, volume: volumes });
const ema9Series = ema({ period: 9, values: closes });
const ema21Series = ema({ period: 21, values: closes });
const sma20Series = sma({ period: 20, values: closes });
const rsi14Series = RSI.calculate({ values: closes, period: 14 });
const macdSeries = MACD.calculate({
  values: closes,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  SimpleMAOscillator: false,
  SimpleMASignal: false,
});

const lookback = candles.slice(-30);
const swingHigh30 = Math.max(...lookback.map((c) => c.high));
const swingLow30 = Math.min(...lookback.map((c) => c.low));
const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);

// Opening range (first 30 min of the persisted window, as a proxy for
// today's opening range — good enough while history is limited to
// whatever's been streamed live).
const openingRangeCandles = candles.slice(0, Math.min(30, candles.length));
const openingRangeHigh = Math.max(...openingRangeCandles.map((c) => c.high));
const openingRangeLow = Math.min(...openingRangeCandles.map((c) => c.low));

const lastClose = last(closes);
const lastVwap = last(vwapSeries);
const lastEma9 = last(ema9Series);
const lastEma21 = last(ema21Series);

output({
  symbol: symbol.toUpperCase(),
  barCount: candles.length,
  dataQuality: candles.length >= FULL_CONFIDENCE_BARS ? 'ok' : 'thin — indicators below may be null or unreliable until more live history accumulates',
  lastTimestamp: last(candles).timestamp,
  close: lastClose,
  vwap: lastVwap,
  priceVsVwapPct: lastVwap ? ((lastClose - lastVwap) / lastVwap) * 100 : null,
  ema9: lastEma9,
  ema21: lastEma21,
  emaTrend: lastEma9 != null && lastEma21 != null ? (lastEma9 > lastEma21 ? 'up' : 'down') : null,
  sma20: last(sma20Series),
  rsi14: last(rsi14Series),
  macd: last(macdSeries) ?? null,
  swingHigh30,
  swingLow30,
  openingRangeHigh,
  openingRangeLow,
  lastVolume: last(volumes),
  avgVolume20,
  volumeVsAvgPct: avgVolume20 ? ((last(volumes) - avgVolume20) / avgVolume20) * 100 : null,
});
