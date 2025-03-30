import { Box, Typography } from '@mui/material';
import { TooltipProps } from 'recharts';
import { useTheme } from '../theme/ThemeContext';
import { CHART_COLORS } from '../constants/colors';
import { formatPrice, formatVolume } from '../utils/formatters';
import { Candlestick } from '../types/Candlestick';
import { Indicator } from '../utils/indicators';
import React from 'react';
import { INDICATOR_DEFS } from '../constants/indicators';
import { TooltipContainer, TooltipDivider, TooltipGrid, TooltipTimestamp } from './TooltipStyles';

export const ChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { isDarkMode } = useTheme();
  if (!active || !payload?.[0]?.payload) return null;
  
  const candle = payload[0].payload as Candlestick;
  const indicators = Object.keys(INDICATOR_DEFS).filter(
    (indicator): indicator is Indicator => indicator in candle
  );

  return (
    <TooltipContainer>
      <TooltipTimestamp time={label}/>
      <TooltipGrid>
        <span style={{ color: CHART_COLORS.open }}>Open:</span><span>{formatPrice(candle.open)}</span>
        <span style={{ color: CHART_COLORS.high }}>High:</span><span>{formatPrice(candle.high)}</span>
        <span style={{ color: CHART_COLORS.low }}>Low:</span><span>{formatPrice(candle.low)}</span>
        <span style={{ color: CHART_COLORS.close }}>Close:</span><span>{formatPrice(candle.close)}</span>
        <span style={{ color: CHART_COLORS.volume }}>Volume:</span><span>{formatVolume(candle.volume)}</span>
      </TooltipGrid>
      {indicators.length > 0 && (
        <>
          <TooltipDivider/>
          <TooltipGrid>
            {indicators.map((indicator) => (
              <React.Fragment key={indicator}>
                <span style={{ color: CHART_COLORS[indicator] }}>
                  {INDICATOR_DEFS[indicator].name}:
                </span>
                <span>{INDICATOR_DEFS[indicator].format(candle[indicator] ?? 0)}</span>
              </React.Fragment>
            ))}
          </TooltipGrid>
        </>
      )}
    </TooltipContainer>
  );
};
