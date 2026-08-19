import { Box, Typography } from '@mui/material';
import { Candlestick } from '../types/Candlestick';
import { CHART_COLORS } from '../constants/colors';
import { formatPrice, formatVolume } from '../utils/formatters';
import { ChartOverlayPanel } from './ChartOverlayPanel';

// Horizontal OHLCV readout, anchored at the top of the chart area — the
// values (not the labels) are all colored by candle direction (bullish vs.
// bearish), unlike the old per-field-colored tooltip, since that's what
// the eye actually wants to know at a glance: up or down.
export const OhlcvLegend = ({ candle }: { candle: Candlestick }) => {
  const color = candle.close >= candle.open ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
  const fields: [string, string][] = [
    ['O', formatPrice(candle.open)],
    ['H', formatPrice(candle.high)],
    ['L', formatPrice(candle.low)],
    ['C', formatPrice(candle.close)],
    ['Vol', formatVolume(candle.volume)],
  ];

  return (
    <ChartOverlayPanel>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.75 }}>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
        {fields.map(([label, value]) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </ChartOverlayPanel>
  );
};
