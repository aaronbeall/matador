import React from 'react';
import { Box, Typography } from '@mui/material';

// Buckets already-sorted (any order in, order preserved out) entries by
// their local calendar date, labeling "Today"/"Yesterday" and an absolute
// date otherwise (year included only once it's not the current one) —
// shared by Activity and Journal so date demarcations read identically
// in both places.
export function groupEntriesByDate<T>(
  entries: T[],
  getTimestamp: (entry: T) => string
): { key: string; label: string; items: T[] }[] {
  const now = new Date();
  const todayKey = now.toDateString();
  const yesterdayKey = new Date(now.getTime() - 86400000).toDateString();
  const groups: { key: string; label: string; items: T[] }[] = [];

  for (const entry of entries) {
    const d = new Date(getTimestamp(entry));
    const key = d.toDateString();
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label =
        key === todayKey
          ? 'Today'
          : key === yesterdayKey
          ? 'Yesterday'
          : d.toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
            });
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }
  return groups;
}

export const TimelineDateHeader = ({ label }: { label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 0.5, '&:first-of-type': { mt: 0 } }}>
    <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
    <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'divider' }} />
  </Box>
);

// One entry's row: a dot on a continuous vertical line (the classic
// timeline read) with the entry's own content to the right. `color`
// lets a dot carry meaning (e.g. a review's verdict color) without
// each caller re-implementing the line/dot geometry.
export const TimelineRow = ({ color = '#9e9e9e', children }: { color?: string; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', gap: 1.5 }}>
    <Box sx={{ position: 'relative', width: 10, flexShrink: 0 }}>
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          bgcolor: 'divider',
          transform: 'translateX(-50%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: 6,
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          border: '2px solid',
          borderColor: 'background.paper',
          transform: 'translateX(-50%)',
          zIndex: 1,
        }}
      />
    </Box>
    <Box sx={{ flexGrow: 1, minWidth: 0, pb: 1.5 }}>{children}</Box>
  </Box>
);
