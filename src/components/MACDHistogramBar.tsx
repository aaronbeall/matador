import { Rectangle } from 'recharts';
import { CHART_COLORS } from '../constants/colors';

interface MACDHistogramBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}

export const MACDHistogramBar = ({ x, y, width, height, value }: MACDHistogramBarProps) => {
  if (!width || !height || typeof value !== 'number') return null;
  
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={Math.abs(height) < 1 ? Math.sign(height) : height}
      fill={value >= 0 ? CHART_COLORS.priceUp : CHART_COLORS.priceDown}
      opacity={0.5}
    />
  );
};
