import { CHART_COLORS } from './colors';

// Shared bullish/bearish/neutral vocabulary — same three-way read, same
// color and icon, wherever a directional call shows up in the UI
// (candlestick patterns today, alerts now too) so "bearish" always looks
// and reads the same regardless of which feature is showing it.
export type Direction = 'bullish' | 'bearish' | 'neutral';

export const DIRECTION_COLOR: Record<Direction, string> = {
  bullish: CHART_COLORS.priceUp,
  bearish: CHART_COLORS.priceDown,
  neutral: '#9e9e9e',
};

export const DIRECTION_ICON: Record<Direction, string> = {
  bullish: '▲',
  bearish: '▼',
  neutral: '●',
};
