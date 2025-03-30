import { TooltipProps } from 'recharts';
import { CHART_COLORS } from '../constants/colors';
import { TooltipContainer, TooltipGrid, TooltipTimestamp } from './TooltipStyles';

const formatMACD = (value: number) => value.toFixed(4);

export const MACDTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.[0]?.payload) return null;
  
  const data = payload[0].payload;

  return (
    <TooltipContainer>
      <TooltipTimestamp time={label} />
      <TooltipGrid>
        <span style={{ color: CHART_COLORS.macdLine }}>MACD:</span>
        <span>{formatMACD(data.macd)}</span>
        <span style={{ color: CHART_COLORS.macdSignal }}>Signal:</span>
        <span>{formatMACD(data.signal)}</span>
        <span style={{ color: data.histogram >= 0 ? CHART_COLORS.priceUp : CHART_COLORS.priceDown }}>
          Histogram:
        </span>
        <span>{formatMACD(data.histogram)}</span>
      </TooltipGrid>
    </TooltipContainer>
  );
};
