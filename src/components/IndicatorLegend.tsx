import { Box, Typography } from '@mui/material';
import { ChartOverlayPanel } from './ChartOverlayPanel';

export interface IndicatorLegendItem {
  key: string;
  label: string;
  value: string;
  color: string;
}

// Vertical list of colored indicator readouts, anchored over the chart —
// reused for the main price chart's overlay lines (EMA/SMA/VWAP) and for
// the MACD/RSI sub-panels' own legends. The label stays neutral; the
// value is colored to match that indicator's line color, same mapping
// already used for the line itself and its toggle-menu swatch.
export const IndicatorLegend = ({ items }: { items: IndicatorLegendItem[] }) => {
  if (!items.length) return null;
  return (
    <ChartOverlayPanel>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {items.map((item) => (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {item.label}
            </Typography>
            <Typography variant="caption" sx={{ color: item.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </ChartOverlayPanel>
  );
};
