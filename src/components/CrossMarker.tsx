import { DIRECTION_COLOR, Direction } from '../constants/direction';
import { SignalKey } from '../constants/signals';

export interface CrossMarkerPoint {
  timestamp: number;
  // null for a non-crossing candle — every candle gets an entry so this
  // Scatter's data array stays index-aligned with the main chart's own
  // `filteredCandles` (see PatternMarkerPoint's `price` for why: a
  // shorter, pre-filtered array confuses Recharts' shared hover/crosshair
  // tracking on a continuous time-scale XAxis).
  value: number | null;
  direction: Direction; // always 'bullish' or 'bearish' in practice for a cross
  signal?: SignalKey; // absent on a `value: null` placeholder entry
}

interface CrossMarkerShapeProps {
  cx?: number;
  cy?: number;
  payload?: CrossMarkerPoint;
  onHover?: (point: CrossMarkerPoint, evt: React.MouseEvent) => void;
  onLeave?: () => void;
}

// Recharts Scatter shape for a crossover event (EMA9/21 or MACD/Signal) —
// a small triangle pointing in the cross's direction, deliberately a
// different silhouette from PatternMarkerShape's dot so a crossover never
// reads as "just another candlestick pattern" at a glance. Same hover
// technique (invisible hit circle behind the visible shape,
// onMouseEnter/onMouseLeave rather than a native <title>) as
// PatternMarkerShape, so CrossTooltip can render the same way
// PatternTooltip does.
export const CrossMarkerShape = (props: CrossMarkerShapeProps) => {
  const { cx, cy, payload, onHover, onLeave } = props;
  if (cx == null || cy == null || !payload || payload.value == null) return <g />;
  const color = DIRECTION_COLOR[payload.direction];
  const size = 5;
  const points =
    payload.direction === 'bullish'
      ? `${cx},${cy - size} ${cx - size},${cy + size} ${cx + size},${cy + size}`
      : `${cx},${cy + size} ${cx - size},${cy - size} ${cx + size},${cy - size}`;

  return (
    <g
      onMouseEnter={(evt) => onHover?.(payload, evt)}
      onMouseLeave={() => onLeave?.()}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={cx} cy={cy} r={9} fill="transparent" />
      <polygon points={points} fill={color} stroke="#000" strokeWidth={0.5} strokeOpacity={0.4} />
    </g>
  );
};
