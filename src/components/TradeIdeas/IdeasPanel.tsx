import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import { TradeIdea } from '../../types/TradeIdea';
import { formatPrice } from '../../utils/formatters';
import { partitionBySymbol } from '../../utils/bySymbol';

const statusColor: Record<TradeIdea['status'], 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  proposed: 'info',
  taken: 'warning',
  skipped: 'default',
  'stopped-out': 'error',
  'target-hit': 'success',
  expired: 'default',
};

const formatAge = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

interface IdeasPanelProps {
  ideas: TradeIdea[];
  lastUpdated: Date | null;
  currentSymbol: string;
}

const renderRow = (idea: TradeIdea) => (
  <TableRow key={idea.id}>
    <TableCell>{idea.symbol}</TableCell>
    <TableCell>{idea.direction === 'long' ? 'Long' : 'Short'}</TableCell>
    <TableCell>{idea.timeframe}</TableCell>
    <TableCell align="right">{formatPrice(idea.entry)}</TableCell>
    <TableCell align="right">{formatPrice(idea.stop)}</TableCell>
    <TableCell align="right">{formatPrice(idea.target)}</TableCell>
    <TableCell align="right">{idea.riskReward.toFixed(1)}</TableCell>
    <TableCell>
      <Chip label={idea.status} size="small" color={statusColor[idea.status]} />
    </TableCell>
    <TableCell align="right">
      <Tooltip title={idea.thesis} placement="left">
        <span>{formatAge(idea.createdAt)}</span>
      </Tooltip>
    </TableCell>
  </TableRow>
);

export const IdeasPanel: React.FC<IdeasPanelProps> = ({ ideas, lastUpdated, currentSymbol }) => {
  const openIdeas = ideas.filter((i) => i.status === 'proposed' || i.status === 'taken');
  // What's relevant to the chart you're actually looking at comes first —
  // see partitionBySymbol.
  const { current, other } = partitionBySymbol(openIdeas, (i) => i.symbol, currentSymbol);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
      </Typography>
      {openIdeas.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No open trade ideas right now. Run the find-trades skill to scan the watchlist.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Dir</TableCell>
                <TableCell>TF</TableCell>
                <TableCell align="right">Entry</TableCell>
                <TableCell align="right">Stop</TableCell>
                <TableCell align="right">Target</TableCell>
                <TableCell align="right">R:R</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Age</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} sx={{ border: 0, pb: 0 }}>
                  <Typography variant="overline" color="text.secondary">
                    {currentSymbol}
                  </Typography>
                </TableCell>
              </TableRow>
              {current.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ border: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      No open ideas for {currentSymbol}.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                current.map(renderRow)
              )}
              {other.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={9} sx={{ borderBottom: 0, pt: 2, pb: 0 }}>
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
      )}
    </Box>
  );
};
