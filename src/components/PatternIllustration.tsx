import React from 'react';
import { CHART_COLORS } from '../constants/colors';

// A schematic OHLC shape — 0 (top) to 100 (bottom) in an arbitrary chart
// unit, not a real price. Bullish/bearish is derived from open vs. close
// the same way the real chart reads it (close above open = bullish, i.e.
// a smaller y since smaller y is the higher price).
interface CandleSpec {
  open: number;
  close: number;
  high: number;
  low: number;
}

// Hand-picked, exaggerated shapes purely to teach the silhouette each
// pattern name refers to — not real market data. Keys match
// PATTERN_INFO/CANDLE_PATTERN_CHECKERS in src/constants/patterns.ts and
// src/utils/indicators.ts.
export const PATTERN_ILLUSTRATIONS: Record<string, CandleSpec[]> = {
  'bullish-engulfing': [
    { open: 35, close: 55, high: 30, low: 60 },
    { open: 60, close: 25, high: 20, low: 65 },
  ],
  'bearish-engulfing': [
    { open: 55, close: 35, high: 30, low: 60 },
    { open: 25, close: 65, high: 20, low: 70 },
  ],
  'bullish-hammer': [{ open: 62, close: 50, high: 45, low: 92 }],
  'bearish-hammer': [{ open: 50, close: 62, high: 45, low: 92 }],
  doji: [{ open: 48, close: 52, high: 15, low: 85 }],
  'morning-star': [
    { open: 25, close: 55, high: 20, low: 60 },
    { open: 63, close: 68, high: 60, low: 72 },
    { open: 65, close: 32, high: 28, low: 70 },
  ],
  'evening-star': [
    { open: 55, close: 25, high: 20, low: 60 },
    { open: 18, close: 13, high: 10, low: 22 },
    { open: 15, close: 48, high: 10, low: 52 },
  ],
  'shooting-star': [{ open: 35, close: 48, high: 8, low: 52 }],
};

// Small inline-SVG rendering of a pattern's candle silhouette(s) — one to
// three bars, schematic not real data. Deliberately reuses the same
// up/down colors as the real chart (CHART_COLORS) so it reads as "this is
// what that pattern actually looks like," not a generic decoration.
export const PatternIllustration: React.FC<{ candles: CandleSpec[] }> = ({ candles }) => {
  const barWidth = 26;
  const width = candles.length * barWidth;
  const height = 100;

  return (
    <svg width={width} height={height * 0.6} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {candles.map((c, i) => {
        const cx = i * barWidth + barWidth / 2;
        const bullish = c.close < c.open;
        const color = bullish ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
        const bodyTop = Math.min(c.open, c.close);
        const bodyBottom = Math.max(c.open, c.close);
        const bodyHeight = Math.max(bodyBottom - bodyTop, 4);
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={c.high} y2={c.low} stroke={color} strokeWidth={1.5} />
            <rect x={cx - barWidth * 0.3} y={bodyTop} width={barWidth * 0.6} height={bodyHeight} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};
