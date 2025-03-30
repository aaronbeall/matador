import { Indicator } from "../utils/indicators";

export type Candlestick = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} & {
  [K in Indicator]?: number;
};

export type TimeInterval = '1m' | '5m' | '15m' | '1h';
