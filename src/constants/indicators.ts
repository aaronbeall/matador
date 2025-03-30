import { Indicator } from '../utils/indicators';

export const INDICATOR_DEFS = {
  vwap: {
    id: 'vwap' as const,
    name: 'VWAP',
    description: 'Volume Weighted Average Price - Shows the average price weighted by volume'
  },
  ema9: {
    id: 'ema9' as const,
    name: 'EMA(9)',
    description: '9-period Exponential Moving Average - Emphasizes recent price action'
  },
  ema21: {
    id: 'ema21' as const,
    name: 'EMA(21)',
    description: '21-period EMA - Medium-term trend indicator'
  },
  sma20: {
    id: 'sma20' as const,
    name: 'SMA(20)',
    description: '20-period Simple Moving Average - Shows average closing price over 20 periods'
  },
  sma50: {
    id: 'sma50' as const,
    name: 'SMA(50)',
    description: '50-period SMA - Medium-term trend indicator'
  },
  sma200: {
    id: 'sma200' as const,
    name: 'SMA(200)',
    description: '200-period SMA - Long-term trend indicator, commonly used to identify bull/bear markets'
  }
} as const;

export type IndicatorDef = typeof INDICATOR_DEFS[Indicator];
