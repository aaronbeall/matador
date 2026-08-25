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

// `color`, when given, tints the label and its divider line — e.g. the
// Journal uses it to reflect a day's overall sentiment, so a rough glance
// down the timeline shows which days ran rough without reading every entry.
export const TimelineDateHeader = ({ label, color }: { label: string; color?: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 0.5, '&:first-of-type': { mt: 0 } }}>
    <Typography variant="subtitle2" fontWeight={700} sx={{ color: color || 'text.primary' }}>{label}</Typography>
    <Box sx={{ flexGrow: 1, height: '1px', bgcolor: color || 'divider', opacity: color ? 0.4 : 1 }} />
  </Box>
);

// The leading element of every timeline row's content — always the time,
// always its own line, so a row reads "when, then what" consistently
// across every panel that uses this timeline (the date itself is already
// carried by TimelineDateHeader, so this is just the time-of-day/precise
// stamp within that date).
export const TimelineTime = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, mb: 0.25 }}>
    {children}
  </Typography>
);

const MARKER_SIZE = 20;

// One entry's row: the entry's own marker icon sitting directly on a
// continuous vertical line (the classic timeline read), with content to
// the right. No separate colored dot shape — the icon itself, colored via
// `color`, *is* the marker; every row needs one (note vs. review, long
// vs. short, an analysis run, ...) so the timeline always has something
// concrete to show, not an anonymous circle.
export const TimelineRow = ({
  color = 'text.secondary',
  icon,
  children,
}: {
  color?: string;
  icon: React.ReactElement;
  children: React.ReactNode;
}) => (
  <Box sx={{ display: 'flex', gap: 1.5 }}>
    <Box sx={{ position: 'relative', width: MARKER_SIZE + 4, flexShrink: 0 }}>
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
          top: 0,
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          bgcolor: 'background.paper',
          transform: 'translateX(-50%)',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 18, color, ...icon.props.sx } })}
      </Box>
    </Box>
    <Box sx={{ flexGrow: 1, minWidth: 0, pb: 1.5 }}>{children}</Box>
  </Box>
);
