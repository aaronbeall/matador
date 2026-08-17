import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip } from '@mui/material';
import { Level } from '../../types/Level';
import { formatPrice } from '../../utils/formatters';

interface LevelsPanelProps {
  levels: Level[];
}

export const LevelsPanel: React.FC<LevelsPanelProps> = ({ levels }) => {
  const active = levels.filter((l) => l.active).sort((a, b) => b.price - a.price);

  if (active.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No levels flagged yet — the find-trades skill writes support/resistance
        levels here as it analyzes the watchlist.
      </Typography>
    );
  }

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
            {active.map((level) => (
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
