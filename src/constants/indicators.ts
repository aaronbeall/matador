import { Indicator } from '../utils/indicators';
import { formatPrice } from '../utils/formatters';

type IndicatorFormatter = (value: number) => string;

export const INDICATOR_DEFS: Record<Indicator, { 
  id: Indicator;
  name: string;
  description: string;
  format: IndicatorFormatter;
}> = {
  vwap: {
    id: 'vwap',
    name: 'VWAP',
    description: 'Volume Weighted Average Price - Shows the average price weighted by volume',
    format: formatPrice
  },
  ema9: {
    id: 'ema9',
    name: 'EMA(9)',
    description: '9-period Exponential Moving Average - Emphasizes recent price action',
    format: formatPrice
  },
  ema21: {
    id: 'ema21',
    name: 'EMA(21)',
    description: '21-period EMA - Medium-term trend indicator',
    format: formatPrice
  },
  sma20: {
    id: 'sma20',
    name: 'SMA(20)',
    description: '20-period Simple Moving Average - Shows average closing price over 20 periods',
    format: formatPrice
  },
  sma50: {
    id: 'sma50',
    name: 'SMA(50)',
    description: '50-period SMA - Medium-term trend indicator',
    format: formatPrice
  },
  sma200: {
    id: 'sma200',
    name: 'SMA(200)',
    description: '200-period SMA - Long-term trend indicator, commonly used to identify bull/bear markets',
    format: formatPrice
  },
  macd: {
    id: 'macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence (12,26,9)',
    format: (v: number) => v.toFixed(4)
  },
  rsi: {
    id: 'rsi',
    name: 'RSI',
    description: 'Relative Strength Index (14)',
    format: (v: number) => v.toFixed(1)
  }
};

export type IndicatorDef = typeof INDICATOR_DEFS[Indicator];
