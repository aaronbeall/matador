import { Fragment } from 'react';
import { Box, Typography } from '@mui/material';
import { ChartOverlayPanel } from './ChartOverlayPanel';

export interface IndicatorLegendItem {
  key: string;
  label: string;
  value: string;
  color: string;
}

// Colored indicator readouts, anchored over the chart — reused for the
// main price chart's overlay lines (EMA/SMA/VWAP) and for the MACD/RSI
// sub-panels' own legends. Laid out as a condensed 2-column grid — names
// in the left column, values in the right, one indicator per row — it's
// its own compact width, not stretched to match whatever else is
// anchored above it (e.g. OhlcvLegend). The label stays neutral; the
// value is colored to match that indicator's line color, same mapping
// already used for the line itself and its toggle-menu swatch.
export const IndicatorLegend = ({ items }: { items: IndicatorLegendItem[] }) => {
  if (!items.length) return null;
  return (
    <ChartOverlayPanel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          columnGap: 1,
          rowGap: 0.25,
          alignItems: 'baseline',
        }}
      >
        {items.map((item) => (
          <Fragment key={item.key}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {item.label}
            </Typography>
            <Typography variant="caption" sx={{ color: item.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {item.value}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </ChartOverlayPanel>
  );
};
