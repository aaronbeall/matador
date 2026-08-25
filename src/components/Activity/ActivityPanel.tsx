import React from 'react';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { AnalysisLogEntry } from '../../types/AnalysisLog';
import { SymbolBadge } from '../SymbolBadge';

interface ActivityPanelProps {
  entries: AnalysisLogEntry[];
}

const formatTimestamp = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ entries }) => {
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No analysis runs logged yet — results of find-trades (and other) tool
        calls show up here, including "no setup found" results.
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {sorted.map((entry) => (
        <ListItem key={entry.id} sx={{ alignItems: 'flex-start' }}>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTimestamp(entry.timestamp)}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {entry.tool}
                </Typography>
                {entry.symbol && <SymbolBadge symbol={entry.symbol} size="small" />}
              </Box>
            }
            secondary={entry.summary}
          />
        </ListItem>
      ))}
    </List>
  );
};
