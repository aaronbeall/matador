import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { Candlestick } from '../types/Candlestick';
import { Indicator } from '../utils/indicators';
import { CHART_COLORS } from '../constants/colors';
import { DIRECTION_COLOR } from '../constants/direction';
import { TrendState } from '../utils/marketStructure';
import { formatPrice, formatVolume } from '../utils/formatters';
import { INDICATOR_DEFS } from '../constants/indicators';
import { ChartOverlayPanel } from './ChartOverlayPanel';

// Static help text for the OHLCV fields — there's no INDICATOR_DEFS entry
// for these (they're not toggleable overlays, just the candle's own raw
// fields), so it lives here rather than being pulled from that shared map.
// ATR/RVOL below DO pull from INDICATOR_DEFS instead of duplicating their
// copy, since those two are genuinely also toggleable indicators elsewhere
// in the app and INDICATOR_DEFS is already the one source of truth for
// what they mean.
const OHLCV_FIELD_HELP: Record<string, string> = {
  O: "Open — this candle's first traded price.",
  H: "High — this candle's highest traded price.",
  L: "Low — this candle's lowest traded price.",
  C: "Close — this candle's last traded price, or the latest live price while it's still forming.",
  Vol: 'Volume — total shares traded during this candle.',
};

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

// `action` is the dynamic, price-aware sentence from describeTrendAction —
// carried on the chip's own tooltip rather than in its (short) label, same
// split as the Stretched chip's short label / this component's own numeric
// fields: the label is a glanceable state, the "what to actually do about
// it" detail lives one hover away.
interface StructureInfo {
  trend: TrendState;
  action: string;
}

const TREND_LABEL: Record<TrendState, string> = { uptrend: 'Uptrend', downtrend: 'Downtrend', range: 'Range' };
const TREND_COLOR: Record<TrendState, string> = { uptrend: DIRECTION_COLOR.bullish, downtrend: DIRECTION_COLOR.bearish, range: DIRECTION_COLOR.neutral };

export const OhlcvLegend = ({ candle, indicators, stretched, structure }: { candle: Candlestick; indicators: Indicator[]; stretched?: StretchInfo | null; structure?: StructureInfo | null }) => {
  const color = candle.close >= candle.open ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
  const fields: [string, string, string][] = [
    ['O', formatPrice(candle.open), OHLCV_FIELD_HELP.O],
    ['H', formatPrice(candle.high), OHLCV_FIELD_HELP.H],
    ['L', formatPrice(candle.low), OHLCV_FIELD_HELP.L],
    ['C', formatPrice(candle.close), OHLCV_FIELD_HELP.C],
    ['Vol', formatVolume(candle.volume), OHLCV_FIELD_HELP.Vol],
  ];
  if (indicators.includes('atr14') && candle.atr14 != null) {
    fields.push(['ATR', formatPrice(candle.atr14), `${INDICATOR_DEFS.atr14.description} ${INDICATOR_DEFS.atr14.why}`]);
  }
  if (indicators.includes('rvol') && candle.rvol != null) {
    fields.push(['RVOL', `${candle.rvol.toFixed(2)}x`, `${INDICATOR_DEFS.rvol.description} ${INDICATOR_DEFS.rvol.why}`]);
  }

  return (
    <ChartOverlayPanel>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.75 }}>
        <Tooltip title="The candle this readout describes — the latest one by default, or whichever you're hovering." placement="bottom" arrow>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', cursor: 'default', pointerEvents: 'auto' }}>
            {new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Tooltip>
        {fields.map(([label, value, help]) => (
          <Tooltip key={label} title={help} placement="bottom" arrow>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, cursor: 'default', pointerEvents: 'auto' }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{value}</Typography>
            </Box>
          </Tooltip>
        ))}
        {stretched && (
          <Tooltip
            title={`Price closed outside its ${stretched.band} envelope — statistically stretched from fair value for this lookback. Worth a reversal candle confirming right at the level before treating it as an entry, not the stretch alone.`}
            placement="bottom"
            arrow
          >
            <Chip
              size="small"
              label={`Stretched ${stretched.direction} ${stretched.band}`}
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: stretched.direction === 'above' ? CHART_COLORS.priceUp : CHART_COLORS.priceDown,
                color: '#fff',
                cursor: 'default',
                pointerEvents: 'auto',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          </Tooltip>
        )}
        {structure && (
          <Tooltip title={structure.action} placement="bottom" arrow>
            <Chip
              size="small"
              label={TREND_LABEL[structure.trend]}
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: TREND_COLOR[structure.trend],
                color: '#fff',
                cursor: 'default',
                pointerEvents: 'auto',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          </Tooltip>
        )}
      </Box>
    </ChartOverlayPanel>
  );
};
