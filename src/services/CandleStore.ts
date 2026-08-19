import { Candlestick, TimeInterval } from '../types/Candlestick';
import { Trade } from '../types/Trade';

const BASE_INTERVAL_MS = 60000; // 1m — the finest granularity we track
// This store now only ever needs to answer "what does the *current,
// still-forming* bucket look like" for whatever interval a client is
// viewing (up to 1h) — real history comes from the persisted cache
// instead (vite-plugins/marketData/service.ts's buildCandlesFor). So it
// only needs to retain enough base 1m candles to cover the slowest
// supported interval's current bucket, with headroom; it used to retain
// 24h under the assumption it was also serving history, which was the
// actual cause of the live chart never showing more than ~a day
// regardless of Display Range.
const RETENTION_MS = 2 * 60 * 60 * 1000;

export class CandleStore {
  // Base candles at 1m resolution, keyed by bucket timestamp. Coarser
  // intervals (5m/15m/1h) are derived from these by aggregation, so a
  // candle's real open/high/low/close is only ever computed once, never
  // collapsed to a single price point.
  private baseCandles: Map<number, Candlestick> = new Map();

  // 1d/1w are never actually requested here — this store only ever
  // aggregates the live 1m trade stream up to 1h. Daily/weekly bars are
  // fetched natively from Alpaca instead (see vite-plugins/marketData/
  // cache.ts) since deriving them from a rolling 1m buffer would need
  // months of retained 1m data for no benefit over Alpaca's own
  // aggregation. Present here only so this satisfies TimeInterval fully.
  private timeIntervalMs: Record<TimeInterval, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '1d': 86400000,
    '1w': 604800000,
  };

  addTrade(trade: Trade) {
    const bucketTimestamp = Math.floor(trade.timestamp / BASE_INTERVAL_MS) * BASE_INTERVAL_MS;
    const existing = this.baseCandles.get(bucketTimestamp);

    if (existing) {
      existing.high = Math.max(existing.high, trade.price);
      existing.low = Math.min(existing.low, trade.price);
      existing.close = trade.price;
      existing.volume += trade.volume;
    } else {
      this.baseCandles.set(bucketTimestamp, {
        timestamp: bucketTimestamp,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.volume,
      });
    }
    this.pruneOld();
  }

  getCandles(timeInterval: TimeInterval): Candlestick[] {
    const sorted = Array.from(this.baseCandles.values()).sort((a, b) => a.timestamp - b.timestamp);
    const intervalMs = this.timeIntervalMs[timeInterval];

    if (intervalMs === BASE_INTERVAL_MS) return sorted;

    const grouped: Map<number, Candlestick> = new Map();
    for (const candle of sorted) {
      const bucketTimestamp = Math.floor(candle.timestamp / intervalMs) * intervalMs;
      const existing = grouped.get(bucketTimestamp);

      if (existing) {
        existing.high = Math.max(existing.high, candle.high);
        existing.low = Math.min(existing.low, candle.low);
        existing.close = candle.close; // sorted ascending — last write is the latest close
        existing.volume += candle.volume;
      } else {
        grouped.set(bucketTimestamp, { ...candle, timestamp: bucketTimestamp });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  private pruneOld() {
    const cutoff = Date.now() - RETENTION_MS;
    for (const timestamp of this.baseCandles.keys()) {
      if (timestamp < cutoff) this.baseCandles.delete(timestamp);
    }
  }
}
