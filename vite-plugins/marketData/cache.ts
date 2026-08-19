import fs from 'fs';
import path from 'path';
import type { Candlestick, TimeInterval } from '../../src/types/Candlestick';
import type { Watchlist } from '../../src/types/Watchlist';
import type { AnalysisSnapshot, TimeframeAnalysis } from '../../src/types/AnalysisSnapshot';
import {
  annotateTimeframe,
  periodKeyFor,
  renderPeriodMarkdown,
  renderLatestMarkdown,
  toTimeframeAnalysis,
} from '../../src/utils/analysis';
import { fetchBars, type AlpacaBar } from './alpaca';
import { TIMEFRAMES, type TimeframeConfig } from './timeframes';
import { evaluateAlertsForSymbol } from './alertsEngine';

// The gap-free, indicator-annotated cache. Maintained proactively for the
// whole active watchlist (see reconcileWatchlist), not just whatever
// symbol happens to be open live in the browser.
//
// Layout — partitioned per timeframe so a read only has to pull what it
// actually needs (an ORB read wants today's 1m; a structure read wants
// months of 1d — not the same file):
//   data/candles/<SYMBOL>/1m/<YYYY-MM-DD>.json + .md    one file per day
//   data/candles/<SYMBOL>/5m/<YYYY-MM-DD>.json + .md    one file per day
//   data/candles/<SYMBOL>/15m/<YYYY-MM-DD>.json + .md   one file per day
//   data/candles/<SYMBOL>/1h/<YYYY-Www>.json + .md      one file per ISO week
//   data/candles/<SYMBOL>/1d/<YYYY-MM>.json + .md       one file per month
//   data/candles/<SYMBOL>/1w.json + 1w.md               single file, no partition
//   data/candles/<SYMBOL>/latest.md                     cross-timeframe quick snapshot
//
// Every .json period file carries full annotation — OHLCV plus every
// deterministic indicator (see src/utils/analysis.ts's annotateTimeframe)
// — it IS the cache; there's no separate raw-only copy. Each .md is a
// direct, concise markdown mirror of its .json sibling, which is what
// find-trades actually reads.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CANDLES_DIR = path.join(DATA_DIR, 'candles');
const WATCHLIST_PATH = path.join(DATA_DIR, 'watchlist.json');

function symbolDir(symbol: string) {
  return path.join(CANDLES_DIR, symbol.toUpperCase());
}

// `key: null` means "unpartitioned" — only valid for '1w', a single file.
function periodJsonPath(symbol: string, interval: TimeInterval, key: string | null) {
  return key === null
    ? path.join(symbolDir(symbol), `${interval}.json`)
    : path.join(symbolDir(symbol), interval, `${key}.json`);
}

function periodMdPath(symbol: string, interval: TimeInterval, key: string | null) {
  return key === null
    ? path.join(symbolDir(symbol), `${interval}.md`)
    : path.join(symbolDir(symbol), interval, `${key}.md`);
}

function latestMdPath(symbol: string) {
  return path.join(symbolDir(symbol), 'latest.md');
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

function writeText(filePath: string, text: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function listPeriodKeys(symbol: string, interval: TimeInterval): (string | null)[] {
  if (interval === '1w') return fs.existsSync(periodJsonPath(symbol, interval, null)) ? [null] : [];
  const dir = path.join(symbolDir(symbol), interval);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length));
}

function readPeriodFile(symbol: string, interval: TimeInterval, key: string | null): Candlestick[] {
  return readJson<AlpacaBar[]>(periodJsonPath(symbol, interval, key), []);
}

function writePeriodFile(symbol: string, interval: TimeInterval, key: string | null, candles: Candlestick[]) {
  writeJson(periodJsonPath(symbol, interval, key), candles);
}

function deletePeriodFile(symbol: string, interval: TimeInterval, key: string | null) {
  for (const p of [periodJsonPath(symbol, interval, key), periodMdPath(symbol, interval, key)]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

// Whatever's currently cached for a timeframe, across all its period
// files, concatenated and sorted. Used by service.ts to seed the live
// CandleStore, by the annotation pass to reconstruct the full continuous
// series, and by recomputeAnalysis to assemble the alerts-engine snapshot.
export function getCachedBars(symbol: string, interval: TimeInterval): Candlestick[] {
  const all: Candlestick[] = [];
  for (const key of listPeriodKeys(symbol, interval)) all.push(...readPeriodFile(symbol, interval, key));
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export function getLatestMarkdown(symbol: string): string | null {
  const filePath = latestMdPath(symbol);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

// Live WS trade path only ever writes 1m (see service.ts persistAll) —
// this is that write. Live data always wins for its own bucket; reconcile
// below is guarded to never stomp the currently-forming bucket, so the
// two never race for the same timestamp.
export function mergeLiveCandles(symbol: string, interval: TimeInterval, incoming: Candlestick[]) {
  const groups = new Map<string | null, Candlestick[]>();
  for (const c of incoming) {
    const key = periodKeyFor(interval, c.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  for (const [key, group] of groups) {
    const existing = readPeriodFile(symbol, interval, key);
    const merged = new Map(existing.map((c) => [c.timestamp, c]));
    for (const c of group) merged.set(c.timestamp, c);
    writePeriodFile(symbol, interval, key, Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp));
  }
}

// Deletes whole period files that fall entirely outside a timeframe's
// lookback window (replaces the old in-array timestamp-filter pruning,
// since storage is now partitioned by period instead of one flat array).
// 1w has no partitioning, so it prunes rows within its single file instead.
function pruneOldPeriods(symbol: string, tf: TimeframeConfig) {
  if (tf.interval === '1w') {
    const cutoff = Date.now() - tf.lookbackDays * ONE_DAY_MS;
    const existing = readPeriodFile(symbol, '1w', null);
    const pruned = existing.filter((c) => c.timestamp >= cutoff);
    if (pruned.length !== existing.length) writePeriodFile(symbol, '1w', null, pruned);
    return;
  }
  // Period key strings (YYYY-MM-DD / YYYY-Www / YYYY-MM) sort
  // lexicographically the same as chronologically, so a plain string
  // comparison against the cutoff's own key is enough.
  const cutoffKey = periodKeyFor(tf.interval, Date.now() - tf.lookbackDays * ONE_DAY_MS)!;
  for (const key of listPeriodKeys(symbol, tf.interval)) {
    if (key !== null && key < cutoffKey) deletePeriodFile(symbol, tf.interval, key);
  }
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

  const groups = new Map<string | null, AlpacaBar[]>();
  for (const bar of fetched) {
    if (guardCurrentBucket && bar.timestamp >= currentBucketStart) continue;
    const key = periodKeyFor(tf.interval, bar.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bar);
  }

  let anyChanged = false;
  for (const [key, bars] of groups) {
    const existing = readPeriodFile(symbol, tf.interval, key);
    const merged = new Map(existing.map((c) => [c.timestamp, c]));
    let groupChanged = false;
    for (const bar of bars) {
      const prev = merged.get(bar.timestamp);
      if (!prev || prev.close !== bar.close || prev.high !== bar.high || prev.low !== bar.low || prev.volume !== bar.volume) {
        groupChanged = true;
      }
      merged.set(bar.timestamp, bar);
    }
    if (groupChanged) {
      writePeriodFile(symbol, tf.interval, key, Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp));
      anyChanged = true;
    }
  }

  pruneOldPeriods(symbol, tf);
  return anyChanged;
}

// Reconstructs the full continuous series for a timeframe (across all its
// period files), re-annotates it in one pass (indicators are causal —
// this can't be done per-period in isolation, see analysis.ts), and splits
// the result back into per-period .json + .md files.
function annotateAndPersist(symbol: string, tf: TimeframeConfig): Candlestick[] {
  const raw = getCachedBars(symbol, tf.interval);
  if (!raw.length) return [];
  const annotated = annotateTimeframe(raw, { intraday: tf.intraday });

  if (tf.interval === '1w') {
    writePeriodFile(symbol, '1w', null, annotated);
    writeText(periodMdPath(symbol, '1w', null), renderPeriodMarkdown(symbol, '1w', 'all', annotated));
    return annotated;
  }

  const groups = new Map<string, Candlestick[]>();
  for (const c of annotated) {
    const key = periodKeyFor(tf.interval, c.timestamp)!;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  for (const [key, candles] of groups) {
    writePeriodFile(symbol, tf.interval, key, candles);
    writeText(periodMdPath(symbol, tf.interval, key), renderPeriodMarkdown(symbol, tf.interval, key, candles));
  }
  return annotated;
}

// Re-annotates only the timeframe(s) that actually changed (cheap — most
// reconcile cycles only touch 1m), then assembles the full six-timeframe
// snapshot from whatever's now persisted (fresh for the changed ones,
// already-annotated-from-a-prior-cycle for the rest) to refresh
// latest.md and feed the alerts engine — same shape it already consumed,
// just sourced from the partitioned cache instead of one combined file.
export function recomputeAnalysis(symbol: string, changedIntervals: TimeInterval[]): void {
  for (const interval of changedIntervals) {
    const tf = TIMEFRAMES.find((t) => t.interval === interval)!;
    annotateAndPersist(symbol, tf);
  }

  const timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>> = {};
  for (const tf of TIMEFRAMES) {
    const candles = getCachedBars(symbol, tf.interval);
    if (candles.length) timeframes[tf.interval] = toTimeframeAnalysis(candles);
  }
  if (Object.keys(timeframes).length === 0) return;

  writeText(latestMdPath(symbol), renderLatestMarkdown(symbol, timeframes));

  const snapshot: AnalysisSnapshot = { symbol: symbol.toUpperCase(), computedAt: new Date().toISOString(), timeframes };
  evaluateAlertsForSymbol(symbol, snapshot);
}

export async function reconcileSymbol(keyId: string, secret: string, symbol: string): Promise<void> {
  const results = await Promise.all(
    TIMEFRAMES.map(async (tf) => ({ interval: tf.interval, changed: await reconcile(keyId, secret, symbol, tf) }))
  );
  const changed = results.filter((r) => r.changed).map((r) => r.interval);
  if (changed.length) recomputeAnalysis(symbol, changed);
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
