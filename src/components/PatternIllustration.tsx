import React from 'react';
import { CHART_COLORS } from '../constants/colors';

// A schematic OHLC shape — 0 (top) to 100 (bottom) in an arbitrary chart
// unit, not a real price. Bullish/bearish is derived from open vs. close
// the same way the real chart reads it (close above open = bullish, i.e.
// a smaller y since smaller y is the higher price).
export interface CandleSpec {
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

// Divergence isn't a candle silhouette — it's a two-swing comparison
// between price and an oscillator — so it needs its own schematic rather
// than forcing it through the candle-shape renderer above. Each spec is a
// pair of tiny line charts (price on top, RSI on bottom) with a dashed
// connector between the two swing points on each, mirroring exactly what
// DivergenceConnectorLayer draws on the real chart — the teaching icon and
// the real feature use the same visual language on purpose. Coordinates
// are hand-picked schematic points in an 80×70 viewBox, not real data.
interface DivergencePoint { x: number; y: number }
interface DivergenceSpec {
  pricePath: string;
  priceConnector: [DivergencePoint, DivergencePoint];
  oscPath: string;
  oscConnector: [DivergencePoint, DivergencePoint];
  direction: 'bullish' | 'bearish';
}

// Same schematic shape for both oscillators — the underlying comparison
// (price's new extreme vs. an oscillator's disagreeing swing) is identical
// regardless of whether the oscillator is RSI or the MACD histogram; only
// which real chart panel it maps to differs (see the RSI/MACD-panel
// connector rendering in App.tsx), which isn't something this icon needs
// to distinguish.
export const DIVERGENCE_ILLUSTRATIONS: Record<string, DivergenceSpec> = {
  // Price prints a higher high (swing2 above swing1); the oscillator's
  // matching swing is lower — momentum disagrees with the new price high.
  'bearish-divergence-rsi': {
    pricePath: 'M5,26 L20,10 L35,22 L55,4 L75,18',
    priceConnector: [{ x: 20, y: 10 }, { x: 55, y: 4 }],
    oscPath: 'M5,64 L20,46 L35,60 L55,54 L75,62',
    oscConnector: [{ x: 20, y: 46 }, { x: 55, y: 54 }],
    direction: 'bearish',
  },
  // Price prints a lower low (swing2 below swing1); the oscillator's
  // matching swing is higher — momentum disagrees with the new price low.
  'bullish-divergence-rsi': {
    pricePath: 'M5,4 L20,20 L35,8 L55,26 L75,12',
    priceConnector: [{ x: 20, y: 20 }, { x: 55, y: 26 }],
    oscPath: 'M5,42 L20,54 L35,46 L55,48 L75,44',
    oscConnector: [{ x: 20, y: 54 }, { x: 55, y: 48 }],
    direction: 'bullish',
  },
  // Hidden — mirror-image comparators of the regular shapes above: same
  // swing type (peaks for bearish, troughs for bullish), but price's
  // second swing goes the OPPOSITE way (shallower, not a new extreme)
  // while the oscillator still moves opposite to price.
  //
  // Price prints a lower high (swing2 below swing1, a shallower bounce);
  // the oscillator's matching swing is higher.
  'bearish-divergence-hidden-rsi': {
    pricePath: 'M5,18 L20,4 L35,14 L55,10 L75,24',
    priceConnector: [{ x: 20, y: 4 }, { x: 55, y: 10 }],
    oscPath: 'M5,62 L20,54 L35,60 L55,46 L75,58',
    oscConnector: [{ x: 20, y: 54 }, { x: 55, y: 46 }],
    direction: 'bearish',
  },
  // Price prints a higher low (swing2 above swing1, a shallower pullback);
  // the oscillator's matching swing is lower.
  'bullish-divergence-hidden-rsi': {
    pricePath: 'M5,10 L20,26 L35,16 L55,20 L75,6',
    priceConnector: [{ x: 20, y: 26 }, { x: 55, y: 20 }],
    oscPath: 'M5,44 L20,48 L35,42 L55,54 L75,40',
    oscConnector: [{ x: 20, y: 48 }, { x: 55, y: 54 }],
    direction: 'bullish',
  },
};
DIVERGENCE_ILLUSTRATIONS['bearish-divergence-macd'] = DIVERGENCE_ILLUSTRATIONS['bearish-divergence-rsi'];
DIVERGENCE_ILLUSTRATIONS['bullish-divergence-macd'] = DIVERGENCE_ILLUSTRATIONS['bullish-divergence-rsi'];
DIVERGENCE_ILLUSTRATIONS['bearish-divergence-hidden-macd'] = DIVERGENCE_ILLUSTRATIONS['bearish-divergence-hidden-rsi'];
DIVERGENCE_ILLUSTRATIONS['bullish-divergence-hidden-macd'] = DIVERGENCE_ILLUSTRATIONS['bullish-divergence-hidden-rsi'];

export const DivergenceIllustration: React.FC<{ spec: DivergenceSpec }> = ({ spec }) => {
  const color = spec.direction === 'bullish' ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
  const lineColor = '#90a4ae'; // same neutral used for the chart's own OHLC lines — this is structure, not a directional read
  const [from, to] = spec.priceConnector;
  const [oscFrom, oscTo] = spec.oscConnector;
  return (
    <svg width={80} height={70} viewBox="0 0 80 70" style={{ display: 'block' }}>
      <path d={spec.pricePath} fill="none" stroke={lineColor} strokeWidth={1.5} />
      <path d={spec.oscPath} fill="none" stroke={lineColor} strokeWidth={1.5} />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
      <line x1={oscFrom.x} y1={oscFrom.y} x2={oscTo.x} y2={oscTo.y} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
      {[from, to, oscFrom, oscTo].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />
      ))}
    </svg>
  );
};

// Small inline-SVG rendering of a pattern's candle silhouette(s) — one to
// three bars, schematic not real data. Deliberately reuses the same
// up/down colors as the real chart (CHART_COLORS) so it reads as "this is
// what that pattern actually looks like," not a generic decoration.
// `size="sm"` renders the same shape at menu-row scale (e.g. a preset
// thumbnail sitting inline next to its label) rather than the larger
// tooltip-illustration scale — same viewBox/proportions either way, just a
// smaller pixel footprint, so one component serves both call sites.
export const PatternIllustration: React.FC<{ candles: CandleSpec[]; size?: 'sm' | 'md' }> = ({ candles, size = 'md' }) => {
  const barWidth = size === 'sm' ? 14 : 26;
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
