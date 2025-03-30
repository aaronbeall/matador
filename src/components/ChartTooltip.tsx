import { Box, Typography } from '@mui/material';
import { TooltipProps } from 'recharts';
import { useTheme } from '../theme/ThemeContext';
import { CHART_COLORS } from '../constants/colors';
import { formatPrice, formatVolume } from '../utils/formatters';
import { Candlestick } from '../types/Candlestick';
import { Indicator } from '../utils/indicators';
import React from 'react';
import { INDICATOR_DEFS } from '../constants/indicators';

export const ChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { isDarkMode } = useTheme();
  if (!active || !payload?.[0]?.payload) return null;
  
  const candle = payload[0].payload as Candlestick;
  const indicators = Object.keys(INDICATOR_DEFS).filter(
    (indicator): indicator is Indicator => indicator in candle
  );

  return (
    <Box
      sx={{
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        fontSize: '0.75rem',
        boxShadow: theme => `0 4px 20px ${isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)'}`,
        backdropFilter: 'blur(8px)',
        transform: 'translateY(-4px)',
        transition: 'all 0.2s ease-out',
      }}
    >
      <Typography variant="caption" display="block" color="text.secondary">
        {new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'auto auto',
        gap: 0.5,
        mt: 0.5,
        color: 'text.primary',
      }}>
        <span style={{ color: CHART_COLORS.open }}>O:</span><span>{formatPrice(candle.open)}</span>
        <span style={{ color: CHART_COLORS.high }}>H:</span><span>{formatPrice(candle.high)}</span>
        <span style={{ color: CHART_COLORS.low }}>L:</span><span>{formatPrice(candle.low)}</span>
        <span style={{ color: CHART_COLORS.close }}>C:</span><span>{formatPrice(candle.close)}</span>
        <span style={{ color: CHART_COLORS.volume }}>V:</span><span>{formatVolume(candle.volume)}</span>
      </Box>
      {indicators.length > 0 && (
        <>
          <Box sx={{ 
            my: 1, 
            height: '1px', 
            bgcolor: 'divider',
            mx: -1.5,
          }} />
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'auto auto',
            gap: 0.5,
            color: 'text.primary',
          }}>
            {indicators.map((indicator) => (
              <React.Fragment key={indicator}>
                <span style={{ color: CHART_COLORS[indicator] }}>
                  {INDICATOR_DEFS[indicator].name}:
                </span>
                <span>{formatPrice(candle[indicator] ?? 0)}</span>
              </React.Fragment>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};
