import { Box } from '@mui/material';
import { useTheme } from '../theme/ThemeContext';
import { PatternDetail } from './PatternVisuals';
import { PatternMarkerPoint } from './PatternMarker';

// Cursor-following tooltip shown while hovering directly over a chart
// marker (see PatternMarker's onMouseEnter/onMouseLeave) — position: fixed
// against the viewport (via clientX/clientY) rather than anything computed
// from the SVG, so it's correct regardless of DOM nesting/overflow.
export const PatternTooltip = ({ point, x, y }: { point: PatternMarkerPoint; x: number; y: number }) => {
  const { isDarkMode } = useTheme();
  if (!point.patterns.length) return null;
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
        gap: 1,
      }}
    >
      {point.patterns.map((key) => (
        <PatternDetail key={key} patternKey={key} />
      ))}
    </Box>
  );
};
