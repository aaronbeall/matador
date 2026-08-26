import React from 'react';
import { CHART_COLORS } from '../constants/colors';
import { Direction } from '../constants/direction';
import { CrossMarkerShape } from './CrossMarker';

// Small inline-SVG teaching schematic for a Signals-tab entry — a
// crossover (two lines meeting, marker at the intersection) or a swing
// (one line with a peak/trough, marker at the extremum). The marker glyph
// itself is the real CrossMarkerShape component, not a redrawn lookalike —
// so the icon and the actual on-chart marker are guaranteed to match,
// same principle DivergenceIllustration already uses for the connector
// line. Coordinates are hand-picked schematic points in an 80×44 viewBox,
// not real data; each shows one representative direction (a signal is
// direction-symmetric on the real chart, this just picks the more
// intuitive textbook example to draw).
interface SignalLine {
  path: string;
  color: string;
  dasharray?: string;
}
interface SignalIllustrationSpec {
  lines: SignalLine[];
  markerX: number;
  markerY: number;
  direction: Direction;
}

export const SIGNAL_ILLUSTRATIONS: Record<string, SignalIllustrationSpec> = {
  // EMA9 (fast) crossing above EMA21 (slow) — same two colors the real
  // chart lines use, so the icon reads as "these two series" at a glance.
  'ema-cross': {
    lines: [
      { path: 'M5,15 L30,20 L55,24 L75,26', color: CHART_COLORS.ema21 },
      { path: 'M5,32 L20,28 L40,22 L55,14 L75,8', color: CHART_COLORS.ema9 },
    ],
    markerX: 43,
    markerY: 21,
    direction: 'bullish',
  },
  // MACD line crossing above its signal line — same colors as the real
  // MACD panel's own lines.
  'macd-cross': {
    lines: [
      { path: 'M5,30 L30,28 L55,24 L75,20', color: CHART_COLORS.macdSignal },
      { path: 'M5,36 L20,32 L40,26 L55,18 L75,10', color: CHART_COLORS.macdLine },
    ],
    markerX: 47,
    markerY: 23,
    direction: 'bullish',
  },
  // A confirmed pivot — one price line, marker sitting right at the peak.
  'swing-high': {
    lines: [{ path: 'M5,35 L25,10 L45,20 L65,15 L75,30', color: '#90a4ae' }],
    markerX: 25,
    markerY: 10,
    direction: 'bearish',
  },
  'swing-low': {
    lines: [{ path: 'M5,10 L25,35 L45,22 L65,28 L75,12', color: '#90a4ae' }],
    markerX: 25,
    markerY: 35,
    direction: 'bullish',
  },
};

export const SignalIllustration: React.FC<{ spec: SignalIllustrationSpec }> = ({ spec }) => (
  <svg width={80} height={44} viewBox="0 0 80 44" style={{ display: 'block', overflow: 'visible' }}>
    {spec.lines.map((line, i) => (
      <path key={i} d={line.path} fill="none" stroke={line.color} strokeWidth={1.5} strokeDasharray={line.dasharray} />
    ))}
    <CrossMarkerShape
      cx={spec.markerX}
      cy={spec.markerY}
      payload={{ timestamp: 0, value: 1, direction: spec.direction }}
    />
  </svg>
);
