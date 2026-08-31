import { Box, Typography } from '@mui/material';
import { useTheme } from '../theme/ThemeContext';
import { BreakMarkerPoint } from './BreakMarker';
import { SIGNAL_INFO } from '../constants/signals';
import { DIRECTION_COLOR, DIRECTION_ICON } from '../constants/direction';

// Cursor-following tooltip for a hovered BOS/CHoCH marker — same
// position:fixed/viewport-coordinate technique as CrossTooltip/
// PatternTooltip, kept as its own component since BreakMarkerPoint isn't a
// CrossMarkerPoint and this needs a slot CrossTooltip has none of: the
// dynamic, price-specific action sentence (precomputed by the caller via
// describeBreakAction and passed in as `action`, rather than recomputed
// per-hover here).
export const BreakTooltip = ({ point, action, x, y }: { point: BreakMarkerPoint; action: string; x: number; y: number }) => {
  const { isDarkMode } = useTheme();
  const info = point.kind ? SIGNAL_INFO[point.kind] : undefined;
  if (!info) return null;
  const color = DIRECTION_COLOR[point.direction];
  return (
    <Box
      sx={{
        position: 'fixed',
        left: x + 14,
        top: y + 14,
        zIndex: 1400,
        bgcolor: isDarkMode ? 'rgba(30,30,30,0.97)' : 'rgba(255,255,255,0.97)',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        boxShadow: 6,
        p: 1.25,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        minWidth: 220,
        maxWidth: 300,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box component="span" sx={{ color, fontSize: 11, lineHeight: 1 }}>{DIRECTION_ICON[point.direction]}</Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color, whiteSpace: 'nowrap' }}>{info.label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {point.direction}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.35 }}>
        {action}
      </Typography>
    </Box>
  );
};
