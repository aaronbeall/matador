import { Box } from '@mui/material';
import { ChartOverlayPanel } from './ChartOverlayPanel';
import { PatternDetail } from './PatternVisuals';

// Anchored readout for whatever pattern(s) the hovered/latest candle
// carries — the always-visible counterpart to PatternTooltip (which only
// shows on a direct hover of a chart marker). Both render the same
// PatternDetail rows so the read is identical either way.
export const PatternBadges = ({ patterns }: { patterns: string[] }) => {
  if (!patterns.length) return null;
  return (
    <ChartOverlayPanel>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
        {patterns.map((key) => (
          <PatternDetail key={key} patternKey={key} />
        ))}
      </Box>
    </ChartOverlayPanel>
  );
};
