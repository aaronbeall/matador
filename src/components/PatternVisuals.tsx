import { Box, Typography } from '@mui/material';
import { PATTERN_INFO, PatternDirection, PatternStrength } from '../constants/patterns';
import { DIRECTION_COLOR, DIRECTION_ICON } from '../constants/direction';

export { DIRECTION_COLOR, DIRECTION_ICON };

const STRENGTH_LEVEL: Record<PatternStrength, number> = { weak: 1, moderate: 2, strong: 3 };

// A weak signal renders noticeably dimmer/more muted than a strong one —
// same hue per direction, opacity scaled by strength — instead of every
// pattern of the same direction looking identically "loud." Opacity-based
// rather than lightening/darkening the hue so it composites correctly
// against both the dark chart background (markers) and the panel
// background (badges/tooltip/menu).
const STRENGTH_OPACITY: Record<PatternStrength, number> = { weak: 0.55, moderate: 0.78, strong: 1 };

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function colorForStrength(hex: string, strength: PatternStrength): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r}, ${g}, ${b}, ${STRENGTH_OPACITY[strength]})`;
}

export function getPatternColor(direction: PatternDirection, strength: PatternStrength): string {
  return colorForStrength(DIRECTION_COLOR[direction], strength);
}

// Three-dot strength meter, filled count = weak(1)/moderate(2)/strong(3) —
// a quick-scan visual instead of making someone read the word.
export const StrengthMeter = ({ strength, color }: { strength: PatternStrength; color: string }) => (
  <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
    {[1, 2, 3].map((i) => (
      <Box
        key={i}
        sx={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          bgcolor: i <= STRENGTH_LEVEL[strength] ? color : 'rgba(128,128,128,0.3)',
        }}
      />
    ))}
  </Box>
);

// One pattern's full detail row — direction icon, name, direction label,
// strength meter, then its plain-language meaning on its own line. Shared
// by PatternBadges (anchored, always visible for the current/hovered
// candle) and PatternTooltip (floating, cursor-following on a direct
// marker hover) so both read identically — same visual hierarchy for
// bullish/bearish/neutral and strength wherever a pattern shows up.
export const PatternDetail = ({ patternKey }: { patternKey: string }) => {
  const info = PATTERN_INFO[patternKey];
  if (!info) return null;
  const baseColor = DIRECTION_COLOR[info.direction];
  // The icon/label carry the strength-scaled color (the "brighter = a
  // stronger signal" read) — the meter dots stay full-brightness so a
  // weak pattern's single filled dot doesn't fade into illegibility.
  const color = getPatternColor(info.direction, info.strength);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 200, maxWidth: 260 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box component="span" sx={{ color, fontSize: 11, lineHeight: 1 }}>{DIRECTION_ICON[info.direction]}</Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color, whiteSpace: 'nowrap' }}>{info.label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
          {info.direction}
        </Typography>
        <StrengthMeter strength={info.strength} color={baseColor} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.35 }}>
        {info.description} {info.why}
      </Typography>
    </Box>
  );
};
