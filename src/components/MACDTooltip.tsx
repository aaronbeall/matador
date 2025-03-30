import { TooltipProps } from 'recharts';
import { CHART_COLORS } from '../constants/colors';
import { TooltipContainer, TooltipGrid, TooltipTimestamp } from './TooltipStyles';
import { INDICATOR_DEFS } from '../constants/indicators';

export const MACDTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.[0]?.payload) return null;
  
  const data = payload[0].payload;
  const format = INDICATOR_DEFS.macd.format;

  return (
    <TooltipContainer>
      <TooltipTimestamp time={label} />
      <TooltipGrid>
        <span style={{ color: CHART_COLORS.macdLine }}>MACD:</span>
        <span>{format(data.macd)}</span>
        <span style={{ color: CHART_COLORS.macdSignal }}>Signal:</span>
        <span>{format(data.signal)}</span>
        <span style={{ color: data.histogram >= 0 ? CHART_COLORS.priceUp : CHART_COLORS.priceDown }}>
          Histogram:
        </span>
        <span>{format(data.histogram)}</span>
      </TooltipGrid>
    </TooltipContainer>
  );
};
