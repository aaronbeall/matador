import { CHART_COLORS } from '../constants/colors';

// A candle shouldn't fill 100% of its slot (no visible gap between bars) —
// but a hard max width was the wrong way to get that: it looked fine with
// many candles on screen (small slots anyway) but turned absurdly skinny
// the moment there were only a few candles and lots of room per slot,
// since it capped the body far below the available width instead of
// scaling with it. A small gap that itself scales with (but is capped by)
// the slot width fixes both ends: tiny slots keep nearly all their width
// (still visibly separated), wide slots get a comfortable body that's
// still clearly not edge-to-edge.
const MIN_BODY_WIDTH = 1;
const MAX_GAP = 3;
const GAP_RATIO = 0.25;

export const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload, background } = props;

  const isBullish = payload.close > payload.open;
  const color = isBullish ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;

  const gap = Math.min(width * GAP_RATIO, MAX_GAP);
  const bodyWidth = Math.max(MIN_BODY_WIDTH, width - gap);
  const bodyX = x + (width - bodyWidth) / 2;
  const centerX = x + width / 2;

  // Calculate price coordinates (use full height for price)
  const yScale = height / (props.high - props.low);
  const yOffset = y + height;

  const getY = (value: number) => yOffset - (value - props.low) * yScale;

  // Wick coordinates
  const wickTop = getY(payload.high);
  const wickBottom = getY(payload.low);

  // Body coordinates
  const openY = getY(payload.open);
  const closeY = getY(payload.close);

  // Volume bar (fixed height at bottom)
  const volumeHeight = 50; // Fixed height for volume bars
  const normalizedVolume = Math.min(payload.volume / props.maxVolume, 1);
  const volumeBarHeight = volumeHeight * normalizedVolume;

  return (
    <g>
      {/* Price candle */}
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={bodyX}
        y={Math.min(openY, closeY)}
        width={bodyWidth}
        height={Math.max(1, Math.abs(closeY - openY))}
        fill={color}
      />
      {/* Volume bar (positioned at bottom using absolute coordinates) */}
      <rect
        x={bodyX}
        y={background.y + background.height - volumeBarHeight}
        width={bodyWidth}
        height={volumeBarHeight}
        fill={color}
        opacity={0.3}
      />
    </g>
  );
};
