import { Box, Typography } from '@mui/material';
import { useTheme } from '../theme/ThemeContext';
import { CrossMarkerPoint } from './CrossMarker';
import { SIGNAL_INFO } from '../constants/signals';
import { DIRECTION_COLOR, DIRECTION_ICON } from '../constants/direction';

// Cursor-following tooltip for a hovered crossover marker — same
// position: fixed / viewport-coordinate technique as PatternTooltip, kept
// as a separate component (rather than generalizing PatternTooltip) since
// the content shape differs: one signal per marker, not a list of
// same-candle pattern hits.
export const CrossTooltip = ({ point, x, y }: { point: CrossMarkerPoint; x: number; y: number }) => {
  const { isDarkMode } = useTheme();
  const info = point.signal ? SIGNAL_INFO[point.signal] : undefined;
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
        minWidth: 200,
        maxWidth: 260,
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
        {info.description} {info.why}
      </Typography>
    </Box>
  );
};
