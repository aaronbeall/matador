import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip } from '@mui/material';
import { Level } from '../../types/Level';
import { formatPrice } from '../../utils/formatters';
import { partitionBySymbol } from '../../utils/bySymbol';

interface LevelsPanelProps {
  levels: Level[];
  currentSymbol: string;
}

const renderRow = (level: Level) => (
  <TableRow key={level.id}>
    <TableCell>{level.symbol}</TableCell>
    <TableCell>
      <Chip
        label={level.type}
        size="small"
        color={level.type === 'resistance' ? 'error' : 'success'}
        variant="outlined"
      />
    </TableCell>
    <TableCell align="right">{formatPrice(level.price)}</TableCell>
    <TableCell>{level.label}</TableCell>
  </TableRow>
);

export const LevelsPanel: React.FC<LevelsPanelProps> = ({ levels, currentSymbol }) => {
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
            <TableRow>
              <TableCell colSpan={4} sx={{ border: 0, pb: 0 }}>
                <Typography variant="overline" color="text.secondary">
                  {currentSymbol}
                </Typography>
              </TableCell>
            </TableRow>
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
                    <Typography variant="overline" color="text.secondary">
                      Other Watchlist Symbols
                    </Typography>
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
