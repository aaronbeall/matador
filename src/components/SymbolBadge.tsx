import React from 'react';
import { Box } from '@mui/material';

interface SymbolBadgeProps {
  symbol: string;
  size?: 'small' | 'medium' | 'large';
}

// One consistent visual identity for a ticker symbol, wherever it appears
// — the "$" prefix plus a distinct monospace/bordered treatment makes it
// instantly recognizable as "this is a symbol," never confusable with a
// status/direction chip or plain label. Deliberately neutral in color
// (not theme primary, not success/error) since a symbol itself isn't a
// bullish/bearish/positive/negative judgment — same reasoning as
// TimeframeChip in AlertsPanel being the plainest-looking chip of its
// group. Renders inline so it drops into a sentence (ActivityPanel) as
// easily as a card header (Alerts/Thesis/Journal/Portfolio).
const SIZE_STYLES = {
  small: { fontSize: '0.7rem', px: 0.6, py: 0.05 },
  medium: { fontSize: '0.8125rem', px: 0.75, py: 0.15 },
  large: { fontSize: '1.5rem', px: 1.25, py: 0.4 },
} as const;

export const SymbolBadge: React.FC<SymbolBadgeProps> = ({ symbol, size = 'medium' }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'monospace',
      fontWeight: 700,
      letterSpacing: 0.4,
      color: 'text.primary',
      bgcolor: 'action.selected',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      ...SIZE_STYLES[size],
    }}
  >
    ${symbol}
  </Box>
);
