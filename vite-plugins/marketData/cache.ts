import fs from 'fs';
import path from 'path';
import type { Candlestick, TimeInterval } from '../../src/types/Candlestick';
import type { Watchlist } from '../../src/types/Watchlist';
import type { AnalysisSnapshot } from '../../src/types/AnalysisSnapshot';
import { computeAnalysisSnapshot } from '../../src/utils/analysis';
import { fetchBars, type AlpacaBar } from './alpaca';
import { TIMEFRAMES, type TimeframeConfig } from './timeframes';

// The gap-free multi-timeframe cache: one bounded, natively-fetched
// Alpaca bar series per (symbol, timeframe), plus the enriched
// multi-timeframe analysis snapshot derived from them. Maintained
// proactively for the whole active watchlist (see reconcileWatchlist),
// not just whatever symbol happens to be open live in the browser — that
// was the actual gap this replaces candleStorage.ts to close.
//
// Layout: data/candles/<SYMBOL>/<interval>.json (raw OHLCV, bounded to
// that timeframe's lookback), data/candles/<SYMBOL>/analysis.json (the
// AnalysisSnapshot find-trades reads).

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CANDLES_DIR = path.join(DATA_DIR, 'candles');
const WATCHLIST_PATH = path.join(DATA_DIR, 'watchlist.json');

function symbolDir(symbol: string) {
  return path.join(CANDLES_DIR, symbol.toUpperCase());
}

function barsFilePath(symbol: string, interval: TimeInterval) {
  return path.join(symbolDir(symbol), `${interval}.json`);
}

function analysisFilePath(symbol: string) {
  return path.join(symbolDir(symbol), 'analysis.json');
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

export function getCachedBars(symbol: string, interval: TimeInterval): Candlestick[] {
  return readJson<AlpacaBar[]>(barsFilePath(symbol, interval), []);
}

export function getAnalysisSnapshot(symbol: string): AnalysisSnapshot | null {
  return readJson<AnalysisSnapshot | null>(analysisFilePath(symbol), null);
}

export function saveAnalysisSnapshot(symbol: string, snapshot: AnalysisSnapshot) {
  writeJson(analysisFilePath(symbol), snapshot);
}

function pruneToLookback(bars: AlpacaBar[], lookbackDays: number): AlpacaBar[] {
  const cutoff = Date.now() - lookbackDays * ONE_DAY_MS;
  return bars.filter((b) => b.timestamp >= cutoff).sort((a, b) => a.timestamp - b.timestamp);
}

// Live WS trade path only ever writes 1m (see service.ts persistAll) —
// this is that write. Live data always wins for its own bucket; reconcile
// below is guarded to never stomp the currently-forming bucket, so the
// two never race for the same timestamp.
export function mergeLiveCandles(symbol: string, interval: TimeInterval, incoming: Candlestick[]) {
  const config = TIMEFRAMES.find((t) => t.interval === interval)!;
  const existing = getCachedBars(symbol, interval);
  const merged = new Map(existing.map((c) => [c.timestamp, c]));
  for (const c of incoming) merged.set(c.timestamp, c);
  writeJson(barsFilePath(symbol, interval), pruneToLookback(Array.from(merged.values()), config.lookbackDays));
}

// Alpaca is treated as the gap oracle: rather than compute "expected"
// bars against a hand-rolled trading calendar, just re-fetch the full
// lookback window and merge — Alpaca wins on conflict since it's ground
// truth, erring toward re-fetch over cleverness per the correctness
// requirement this cache exists for. Only 1m has a competing live writer
// (mergeLiveCandles above), so only 1m guards its in-progress bucket from
// being overwritten by a lagging REST response; every other timeframe has
// no other writer, so reconcile can freely replace its current bar too.
export async function reconcile(
  keyId: string,
  secret: string,
  symbol: string,
  tf: TimeframeConfig
): Promise<boolean> {
  const now = Date.now();
  const startISO = new Date(now - tf.lookbackDays * ONE_DAY_MS).toISOString();
  const fetched = await fetchBars(keyId, secret, symbol, tf.alpaca, startISO, new Date(now).toISOString());
  if (!fetched) return false; // API failure — leave existing cache alone rather than wipe it

  const guardCurrentBucket = tf.interval === '1m';
  const currentBucketStart = Math.floor(now / tf.intervalMs) * tf.intervalMs;

  const existing = getCachedBars(symbol, tf.interval);
  const merged = new Map(existing.map((c) => [c.timestamp, c]));
  let changed = false;

  for (const bar of fetched) {
    if (guardCurrentBucket && bar.timestamp >= currentBucketStart) continue;
    const prev = merged.get(bar.timestamp);
    if (!prev || prev.close !== bar.close || prev.high !== bar.high || prev.low !== bar.low || prev.volume !== bar.volume) {
      changed = true;
    }
    merged.set(bar.timestamp, bar);
  }

  if (changed) {
    writeJson(barsFilePath(symbol, tf.interval), pruneToLookback(Array.from(merged.values()), tf.lookbackDays));
  }
  return changed;
}

// Shared by the background reconcile below (after a gap-fill actually
// changes something) and by the live WS persist path in service.ts
// (every ~10s while a symbol has an active browser subscriber) — same
// cadence find-trades' staleness check already assumed pre-migration, now
// just reading whichever timeframes are cached rather than only 1m.
export function recomputeAnalysis(symbol: string): void {
  const byTimeframe = Object.fromEntries(
    TIMEFRAMES.map((tf) => [tf.interval, getCachedBars(symbol, tf.interval)])
  ) as Record<TimeInterval, Candlestick[]>;

  const snapshot = computeAnalysisSnapshot(symbol, byTimeframe);
  if (snapshot) saveAnalysisSnapshot(symbol, snapshot);
}

export async function reconcileSymbol(keyId: string, secret: string, symbol: string): Promise<void> {
  const results = await Promise.all(TIMEFRAMES.map((tf) => reconcile(keyId, secret, symbol, tf)));
  if (results.some(Boolean)) recomputeAnalysis(symbol);
}

export function readWatchlistSymbols(): string[] {
  const watchlist = readJson<Watchlist>(WATCHLIST_PATH, []);
  return watchlist.filter((e) => e.active).map((e) => e.symbol.toUpperCase());
}

export async function reconcileWatchlist(keyId: string, secret: string): Promise<void> {
  for (const symbol of readWatchlistSymbols()) {
    try {
      await reconcileSymbol(keyId, secret, symbol);
    } catch (err) {
      console.warn(`[market-data] reconcile failed for ${symbol}:`, err);
    }
  }
}

function rmSymbolDir(symbol: string) {
  fs.rmSync(symbolDir(symbol), { recursive: true, force: true });
}

export async function clearSymbol(keyId: string, secret: string, symbol: string): Promise<void> {
  rmSymbolDir(symbol);
  await reconcileSymbol(keyId, secret, symbol);
}

export async function clearAll(keyId: string, secret: string): Promise<void> {
  for (const symbol of readWatchlistSymbols()) {
    await clearSymbol(keyId, secret, symbol);
  }
}
