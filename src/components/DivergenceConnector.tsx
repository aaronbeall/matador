import { DIRECTION_COLOR, Direction } from '../constants/direction';

export interface DivergenceConnectorPair {
  id: string;
  fromTimestamp: number;
  fromValue: number;
  toTimestamp: number;
  toValue: number;
  direction: Direction;
}

// Renders as a Recharts <Customized> child — drawing directly in the
// chart's own SVG coordinate space via its live axis scales, rather than
// an absolutely-positioned viewport overlay (the technique PatternTooltip
// uses for its cursor-following box). That's the right tool for a
// cursor-following tooltip, but wrong here: these two points are chart
// DATA, and Recharts already exposes real scale objects for exactly this
// (see priceScaleRef's capture in App.tsx) — no viewport/getBoundingClientRect
// math needed. Used identically in both the main price panel and the RSI
// panel; each panel's own x/y scale naturally places the line on that
// panel's own data (price vs. RSI) for the same two swing timestamps.
export const DivergenceConnectorLayer = ({
  xAxisMap,
  yAxisMap,
  pairs,
}: {
  xAxisMap?: Record<string, { scale?: (v: number) => number }>;
  yAxisMap?: Record<string, { scale?: (v: number) => number }>;
  pairs: DivergenceConnectorPair[];
}) => {
  const xScale = xAxisMap && Object.values(xAxisMap)[0]?.scale;
  const yScale = yAxisMap && Object.values(yAxisMap)[0]?.scale;
  if (!xScale || !yScale || pairs.length === 0) return null;

  return (
    <g>
      {pairs.map((p) => {
        const x1 = xScale(p.fromTimestamp);
        const y1 = yScale(p.fromValue);
        const x2 = xScale(p.toTimestamp);
        const y2 = yScale(p.toValue);
        if ([x1, y1, x2, y2].some((v) => v == null || Number.isNaN(v))) return null;
        const color = DIRECTION_COLOR[p.direction];
        return (
          <g key={p.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.85} />
            <circle cx={x1} cy={y1} r={3} fill={color} opacity={0.85} />
            <circle cx={x2} cy={y2} r={3} fill={color} opacity={0.85} />
          </g>
        );
      })}
    </g>
  );
};
