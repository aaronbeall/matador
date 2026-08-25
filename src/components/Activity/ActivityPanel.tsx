import React from 'react';
import { Box, Typography } from '@mui/material';
import { Insights as AnalysisIcon } from '@mui/icons-material';
import { AnalysisLogEntry } from '../../types/AnalysisLog';
import { SymbolBadge } from '../SymbolBadge';
import { groupEntriesByDate, TimelineDateHeader, TimelineRow, TimelineTime } from '../Timeline';

interface ActivityPanelProps {
  entries: AnalysisLogEntry[];
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

  const groups = groupEntriesByDate(sorted, (e) => e.timestamp);

  return (
    <Box>
      {groups.map((group) => (
        <React.Fragment key={group.key}>
          <TimelineDateHeader label={group.label} />
          {group.items.map((entry) => (
            <TimelineRow key={entry.id} icon={<AnalysisIcon />}>
              <TimelineTime>{formatTime(entry.timestamp)}</TimelineTime>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight="bold">{entry.tool}</Typography>
                {entry.symbol && <SymbolBadge symbol={entry.symbol} size="small" />}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {entry.summary}
              </Typography>
            </TimelineRow>
          ))}
        </React.Fragment>
      ))}
    </Box>
  );
};
