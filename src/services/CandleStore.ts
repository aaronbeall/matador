import { Candlestick, TimeInterval } from '../types/Candlestick';
import { Trade } from '../types/Trade';

export class CandleStore {
  private trades: Trade[] = [];
  private timeIntervalMs: Record<TimeInterval, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000
  };

  addTrade(trade: Trade) {
    this.trades.push(trade);
    // Keep only last 24 hours of trades
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.trades = this.trades.filter(t => t.timestamp >= oneDayAgo);
  }

  getCandles(timeInterval: TimeInterval): Candlestick[] {
    const interval = this.timeIntervalMs[timeInterval];
    const candles: Map<number, Candlestick> = new Map();

    this.trades.forEach(trade => {
      const candleTimestamp = Math.floor(trade.timestamp / interval) * interval;
      const existingCandle = candles.get(candleTimestamp);

      if (existingCandle) {
        existingCandle.high = Math.max(existingCandle.high, trade.price);
        existingCandle.low = Math.min(existingCandle.low, trade.price);
        existingCandle.close = trade.price;
        existingCandle.volume += trade.volume;
      } else {
        candles.set(candleTimestamp, {
          timestamp: candleTimestamp,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.volume
        });
      }
    });

    return Array.from(candles.values()).sort((a, b) => a.timestamp - b.timestamp);
  }
}
