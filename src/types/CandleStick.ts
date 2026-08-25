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
  // Analysis-only annotations (src/utils/analysis.ts) — not part of the
  // chart's toggleable Indicator union since they're never rendered as a
  // chart overlay, just read from data/candles/<symbol>/analysis.md.
  atr14?: number;
  patterns?: string[];
  // Relative volume — this candle's volume vs. its trailing 20-bar
  // average (not a session-cumulative RVOL like a scanner shows; a
  // per-candle spike-detection variant instead, chosen because it fits
  // the same per-candle annotation pipeline as everything else here).
  rvol?: number;
  // VWAP standard-deviation bands — day-aware like vwap itself, attached
  // alongside it in attachDailyVWAP (src/utils/analysis.ts). Rendered as
  // part of the existing 'vwap' toggle rather than a separate one, since
  // they're only ever meaningful together with the vwap line.
  vwapUpper1?: number;
  vwapLower1?: number;
  vwapUpper2?: number;
  vwapLower2?: number;
  // Bollinger Bands — unlike VWAP bands, not day-scoped (a plain rolling
  // window over close), so it works on any timeframe including 1d/1w.
  // Rendered as part of the 'bollingerBands' toggle, same convention as
  // vwap's bands being folded into a single indicator entry above.
  bollingerMiddle?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
} & {
  [K in Indicator]?: number;
}

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
