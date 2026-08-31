import { DIRECTION_COLOR, Direction } from '../constants/direction';

// Separate from CrossMarkerPoint (not an extension of it) — a structure
// break carries the broken level/timestamp a crossover has no use for, and
// giving CrossMarkerPoint optional fields it only sometimes needs would
// blur what that type is for.
export interface BreakMarkerPoint {
  timestamp: number;
  // null for a candle with no break — every candle gets an entry so this
  // Scatter's data array stays index-aligned with filteredCandles, same
  // reasoning as every other marker on this chart (see CrossMarkerPoint).
  value: number | null;
  direction: Direction;
  kind?: 'bos' | 'choch'; // absent on a `value: null` placeholder entry
  brokenLevel?: number;
  brokenLevelTimestamp?: number;
}

interface BreakMarkerShapeProps {
  cx?: number;
  cy?: number;
  payload?: BreakMarkerPoint;
  onHover?: (point: BreakMarkerPoint, evt: React.MouseEvent) => void;
  onLeave?: () => void;
}

// Recharts Scatter shape for a BOS/CHoCH event — a small flag/pennant
// glyph, deliberately a different silhouette from both CrossMarkerShape's
// triangle and PatternMarkerShape's dot, so a structure break never reads
// as "just another crossover" at a glance. Same hover technique (invisible
// hit-circle, onMouseEnter/onMouseLeave) as every other marker on this
// chart, so BreakTooltip can render the same way CrossTooltip does.
export const BreakMarkerShape = (props: BreakMarkerShapeProps) => {
  const { cx, cy, payload, onHover, onLeave } = props;
  if (cx == null || cy == null || !payload || payload.value == null) return <g />;
  const color = DIRECTION_COLOR[payload.direction];
  // Flagpole runs from the break candle up/down toward the broken level's
  // side (bullish break = pole rises, bearish break = pole drops), with a
  // small triangular flag at the top of the pole — a CHoCH gets a hollow
  // flag, a BOS a filled one, so the two are distinguishable without
  // reading the tooltip.
  const rise = payload.direction === 'bullish' ? -1 : 1;
  const poleTop = cy + rise * 11;
  const flagPoints = `${cx},${poleTop} ${cx + 6},${poleTop - rise * 2} ${cx},${poleTop - rise * 4}`;

  return (
    <g
      onMouseEnter={(evt) => onHover?.(payload, evt)}
      onMouseLeave={() => onLeave?.()}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={cx} cy={cy} r={10} fill="transparent" />
      <line x1={cx} y1={cy} x2={cx} y2={poleTop} stroke={color} strokeWidth={1.5} />
      <polygon
        points={flagPoints}
        fill={payload.kind === 'choch' ? 'none' : color}
        stroke={color}
        strokeWidth={1.25}
      />
    </g>
  );
};
