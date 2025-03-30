import { CHART_COLORS } from '../constants/colors';

export const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  const isBullish = payload.close > payload.open;
  const color = isBullish ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
  
  // Calculate Y coordinates relative to the data range
  const yScale = height / (props.high - props.low);
  const yOffset = y + height;
  
  const getY = (value: number) => yOffset - (value - props.low) * yScale;
  
  // Wick coordinates
  const wickTop = getY(payload.high);
  const wickBottom = getY(payload.low);
  
  // Body coordinates
  const openY = getY(payload.open);
  const closeY = getY(payload.close);
  
  return (
    <g>
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
    </g>
  );
};
