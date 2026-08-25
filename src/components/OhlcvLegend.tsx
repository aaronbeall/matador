import { Box, Chip, Typography } from '@mui/material';
import { Candlestick } from '../types/Candlestick';
import { Indicator } from '../utils/indicators';
import { CHART_COLORS } from '../constants/colors';
import { formatPrice, formatVolume } from '../utils/formatters';
import { ChartOverlayPanel } from './ChartOverlayPanel';

// Horizontal OHLCV readout, anchored at the top of the chart area — the
// values (not the labels) are all colored by candle direction (bullish vs.
// bearish), unlike the old per-field-colored tooltip, since that's what
// the eye actually wants to know at a glance: up or down.
//
// ATR/RVOL append onto this same row (rather than getting their own
// IndicatorLegend rows) since neither has a chart line to go with it —
// they're numeric context read alongside price, not an overlay. Still
// gated by `indicators` like everything else so they're configurable, not
// unconditionally on.
interface StretchInfo {
  direction: 'above' | 'below';
  band: string;
}

export const OhlcvLegend = ({ candle, indicators, stretched }: { candle: Candlestick; indicators: Indicator[]; stretched?: StretchInfo | null }) => {
  const color = candle.close >= candle.open ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
  const fields: [string, string][] = [
    ['O', formatPrice(candle.open)],
    ['H', formatPrice(candle.high)],
    ['L', formatPrice(candle.low)],
    ['C', formatPrice(candle.close)],
    ['Vol', formatVolume(candle.volume)],
  ];
  if (indicators.includes('atr14') && candle.atr14 != null) fields.push(['ATR', formatPrice(candle.atr14)]);
  if (indicators.includes('rvol') && candle.rvol != null) fields.push(['RVOL', `${candle.rvol.toFixed(2)}x`]);

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
        {stretched && (
          <Chip
            size="small"
            label={`Stretched ${stretched.direction} ${stretched.band}`}
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: stretched.direction === 'above' ? CHART_COLORS.priceUp : CHART_COLORS.priceDown,
              color: '#fff',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}
      </Box>
    </ChartOverlayPanel>
  );
};
