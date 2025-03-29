export interface StockData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema20?: number;
  ema50?: number;
  bb?: {
    top: number;
    middle: number;
    bottom: number;
  };
  macd?: {
    macd: number;
    signal: number;
    divergence: number;
  };
  rsi?: number;
}
