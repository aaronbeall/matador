import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Level } from '../../types/Level';
import { formatPrice } from '../../utils/formatters';
import { partitionBySymbol } from '../../utils/bySymbol';
import { SymbolBadge } from '../SymbolBadge';
import { PanelSectionHeader } from '../Sidebar/PanelSectionHeader';
import { CHART_COLORS } from '../../constants/colors';

interface LevelsPanelProps {
  levels: Level[];
  currentSymbol: string;
  multiSymbol: boolean;
}

// Same dashed-line style App.tsx actually draws for this level on the
// chart (ReferenceLine strokeDasharray="6 3", strokeOpacity={0.5}) —
// rendered full-width in the table so a row visually maps to its own line
// on the chart, not just a same-colored word next to it.
const LevelLineSwatch = ({ color }: { color: string }) => (
  <svg width="100%" height="10" style={{ display: 'block' }}>
    <line x1="0" y1="5" x2="100%" y2="5" stroke={color} strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} />
  </svg>
);

const renderRow = (level: Level) => {
  const color = level.type === 'resistance' ? CHART_COLORS.priceDown : CHART_COLORS.priceUp;
  return (
    <TableRow key={level.id}>
      <TableCell><SymbolBadge symbol={level.symbol} size="small" /></TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: '100%' }}>
          <Typography variant="caption" sx={{ color, textTransform: 'capitalize', fontWeight: 600, lineHeight: 1 }}>
            {level.type}
          </Typography>
          <LevelLineSwatch color={color} />
        </Box>
      </TableCell>
      <TableCell align="right">{formatPrice(level.price)}</TableCell>
      <TableCell>{level.label}</TableCell>
    </TableRow>
  );
};

export const LevelsPanel: React.FC<LevelsPanelProps> = ({ levels, currentSymbol, multiSymbol }) => {
  const active = levels.filter((l) => l.active).sort((a, b) => b.price - a.price);

  if (active.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No levels flagged yet — the find-trades skill writes support/resistance
        levels here as it analyzes the watchlist.
      </Typography>
    );
  }

  // What's relevant to the chart you're actually looking at comes first —
  // see partitionBySymbol.
  const { current, other } = partitionBySymbol(active, (l) => l.symbol, currentSymbol);

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Label</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {multiSymbol && (
              <TableRow>
                <TableCell colSpan={4} sx={{ border: 0, pb: 0 }}>
                  <PanelSectionHeader>{currentSymbol}</PanelSectionHeader>
                </TableCell>
              </TableRow>
            )}
            {current.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ border: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    No levels for {currentSymbol}.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              current.map(renderRow)
            )}
            {other.length > 0 && (
              <>
                <TableRow>
                  <TableCell colSpan={4} sx={{ borderBottom: 0, pt: 2, pb: 0 }}>
                    <PanelSectionHeader>Other Watchlist Symbols</PanelSectionHeader>
                  </TableCell>
                </TableRow>
                {other.map(renderRow)}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
