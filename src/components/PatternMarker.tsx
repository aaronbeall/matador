import { CHART_COLORS } from '../constants/colors';
import { PatternDirection, PatternStrength } from '../constants/patterns';
import { colorForStrength } from './PatternVisuals';

export interface PatternMarkerPoint {
  timestamp: number;
  price: number;
  direction: PatternDirection | 'mixed';
  // The strongest strength among this candle's (enabled) patterns —
  // drives the marker's brightness, see colorForStrength.
  strength: PatternStrength;
  patterns: string[];
}

const BASE_COLOR: Record<PatternMarkerPoint['direction'], string> = {
  bullish: CHART_COLORS.priceUp,
  bearish: CHART_COLORS.priceDown,
  mixed: '#9e9e9e',
  neutral: '#9e9e9e',
};

// Size reinforces the same strength read as the color dimming
// (colorForStrength) — a weak signal's opacity difference alone is easy
// to miss at a glance on a busy chart; a visibly smaller dot makes it
// unambiguous without needing to zoom in or hover.
const STRENGTH_RADIUS: Record<PatternStrength, number> = { weak: 3, moderate: 4, strong: 5 };

interface PatternMarkerShapeProps {
  cx?: number;
  cy?: number;
  payload?: PatternMarkerPoint;
  onHover?: (point: PatternMarkerPoint, evt: React.MouseEvent) => void;
  onLeave?: () => void;
}

// Recharts Scatter shape — one small marker per candle carrying at least
// one detected pattern, positioned above the high (bearish), below the low
// (bullish), or at the midpoint (neutral/mixed) by computePatternMarkers
// in App.tsx. Hover is real onMouseEnter/onMouseLeave (not a native SVG
// <title>) so PatternTooltip can render a properly designed, custom tooltip
// instead of the browser's unstyleable default — a larger transparent hit
// circle sits behind the visible dot so the hover target isn't a 4px
// bullseye.
export const PatternMarkerShape = (props: PatternMarkerShapeProps) => {
  const { cx, cy, payload, onHover, onLeave } = props;
  if (cx == null || cy == null || !payload) return <g />;
  const color = colorForStrength(BASE_COLOR[payload.direction] ?? '#9e9e9e', payload.strength);
  const radius = STRENGTH_RADIUS[payload.strength];

  return (
    <g
      onMouseEnter={(evt) => onHover?.(payload, evt)}
      onMouseLeave={() => onLeave?.()}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={cx} cy={cy} r={9} fill="transparent" />
      <circle cx={cx} cy={cy} r={radius} fill={color} stroke="#000" strokeWidth={0.5} strokeOpacity={0.4} />
    </g>
  );
};
