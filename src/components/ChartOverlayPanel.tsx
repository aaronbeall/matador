import { PropsWithChildren } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '../theme/ThemeContext';

// Shared chrome for the anchored chart overlays (OhlcvLegend, IndicatorLegend)
// — replaces the old hover-following ChartTooltip/MACDTooltip: these sit in
// a fixed spot over the chart and always show something (the hovered
// candle, or the latest one), rather than appearing only on hover.
export const ChartOverlayPanel = ({ children }: PropsWithChildren) => {
  const { isDarkMode } = useTheme();
  return (
    <Box
      sx={{
        display: 'inline-flex',
        bgcolor: isDarkMode ? 'rgba(18,18,18,0.72)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(6px)',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        px: 1,
        py: 0.5,
        pointerEvents: 'none',
      }}
    >
      {children}
    </Box>
  );
};
