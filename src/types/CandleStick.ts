import { Indicator } from "../utils/indicators";
import { MACDResult } from "./TechnicalIndicators";

export type Candlestick = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // MACD's line value lives in the `macd` indicator field below; its
  // signal/histogram counterparts aren't part of the Indicator union
  // (they're not independently toggleable), so they get their own fields.
  signal?: number;
  histogram?: number;
} & {
  [K in Indicator]?: number;
}

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
