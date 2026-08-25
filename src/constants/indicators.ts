import { Indicator } from '../utils/indicators';
import { formatPrice } from '../utils/formatters';

type IndicatorFormatter = (value: number) => string;

export const INDICATOR_DEFS: Record<Indicator, {
  id: Indicator;
  name: string;
  description: string; // what it is, plainly
  why: string; // why you'd actually want it on the chart
  format: IndicatorFormatter;
}> = {
  vwap: {
    id: 'vwap',
    name: 'VWAP',
    description: 'Volume-weighted average price for the current session.',
    why: 'A fair-value reference — price reclaiming or rejecting it is a common intraday signal.',
    format: formatPrice
  },
  ema9: {
    id: 'ema9',
    name: 'EMA(9)',
    description: 'Fast-reacting 9-period exponential moving average.',
    why: 'Reads very short-term momentum, and works as a dynamic support/resistance level while a trend is running.',
    format: formatPrice
  },
  ema21: {
    id: 'ema21',
    name: 'EMA(21)',
    description: 'Medium-term 21-period exponential moving average.',
    why: "A common 'is this pullback still healthy' check — holding above it in an uptrend (or below in a downtrend) argues the trend is intact.",
    format: formatPrice
  },
  sma20: {
    id: 'sma20',
    name: 'SMA(20)',
    description: 'Simple average of the last 20 closes.',
    why: 'Useful as a trend filter and as a pullback-entry reference in a trending market.',
    format: formatPrice
  },
  sma50: {
    id: 'sma50',
    name: 'SMA(50)',
    description: 'Simple average of the last 50 closes.',
    why: "A medium-term trend reference — price's relationship to this line is a common way to judge whether a pullback is healthy or turning into a real reversal.",
    format: formatPrice
  },
  sma200: {
    id: 'sma200',
    name: 'SMA(200)',
    description: 'Simple average of the last 200 closes.',
    why: 'The classic long-term trend line — price above or below it is a quick, widely-used read on whether a stock is in a broad bull or bear market.',
    format: formatPrice
  },
  macd: {
    id: 'macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence (12, 26, 9).',
    why: "A momentum/trend-strength gauge — useful for spotting a shift in momentum (a crossover) before it's obvious from price alone.",
    format: (v: number) => v.toFixed(4)
  },
  rsi: {
    id: 'rsi',
    name: 'RSI',
    description: 'Relative Strength Index, 0-100 (14-period).',
    why: "Useful for spotting overbought/oversold conditions and divergences — where price makes a new extreme but momentum doesn't confirm it.",
    format: (v: number) => v.toFixed(1)
  },
  vwapBands: {
    id: 'vwapBands',
    name: 'VWAP Bands',
    description: '±1σ/±2σ volume-weighted bands around VWAP, toggled independently of VWAP itself.',
    why: 'Useful for judging how stretched price is from fair value — a move outside the bands is statistically unusual for the session.',
    format: formatPrice
  },
  atr14: {
    id: 'atr14',
    name: 'ATR(14)',
    description: 'Average True Range — the typical bar range over 14 periods. Shown in the OHLCV readout.',
    why: 'Useful for sizing a stop wide enough to survive normal noise, instead of picking an arbitrary dollar distance.',
    format: formatPrice
  },
  rvol: {
    id: 'rvol',
    name: 'RVOL',
    description: "This bar's volume vs. its trailing 20-bar average. Shown in the OHLCV readout.",
    why: 'Useful for confirming a breakout/breakdown has real participation behind it, not just a quiet drift.',
    format: (v: number) => `${v.toFixed(2)}x`
  },
  bollingerBands: {
    id: 'bollingerBands',
    name: 'Bollinger Bands',
    description: '20-period SMA ±2σ bands around close — unlike VWAP Bands, not session-scoped, so it works on any timeframe.',
    why: 'The swing/any-timeframe read on how stretched price is from fair value — a close outside the bands is statistically unusual for the lookback.',
    format: formatPrice
  }
};

export type IndicatorDef = typeof INDICATOR_DEFS[Indicator];
