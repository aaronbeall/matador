export type CandleStick = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TimeInterval = '1m' | '5m' | '15m' | '1h';
