import { CHART_COLORS } from '../constants/colors';

export const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload, background } = props;
  console.log('CandlestickBar props:', props);
  
  const isBullish = payload.close > payload.open;
  const color = isBullish ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
  
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
        x1={x + width / 2}
        y1={wickTop}
        x2={x + width / 2}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={Math.min(openY, closeY)}
        width={width}
        height={Math.max(1, Math.abs(closeY - openY))}
        fill={color}
      />
      {/* Volume bar (positioned at bottom using absolute coordinates) */}
      <rect
        x={x}
        y={background.y + background.height - volumeBarHeight}
        width={width}
        height={volumeBarHeight}
        fill={color}
        opacity={0.3}
      />
    </g>
  );
};
