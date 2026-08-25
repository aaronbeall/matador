import React from 'react';
import { Box, Typography, Chip, Divider, Stack } from '@mui/material';
import {
  CheckCircle as HitIcon,
  Cancel as MissIcon,
  VisibilityOff as MissedOpportunityIcon,
  Shield as DodgedTrapIcon,
  EditNote as NoteIcon,
} from '@mui/icons-material';
import { JournalEntry, ReviewVerdict } from '../../types/Journal';
import { formatTimestamp } from '../../utils/formatters';
import { SymbolBadge } from '../SymbolBadge';

interface JournalPanelProps {
  journal: JournalEntry[];
}

const VERDICT_COLOR: Record<ReviewVerdict, 'success' | 'error' | 'warning' | 'info'> = {
  hit: 'success',
  miss: 'error',
  'missed-opportunity': 'warning',
  'dodged-trap': 'info',
};

const VERDICT_ICON: Record<ReviewVerdict, React.ElementType> = {
  hit: HitIcon,
  miss: MissIcon,
  'missed-opportunity': MissedOpportunityIcon,
  'dodged-trap': DodgedTrapIcon,
};

const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  hit: 'Hit',
  miss: 'Miss',
  'missed-opportunity': 'Missed opportunity',
  'dodged-trap': 'Dodged trap',
};

// Lightweight scoreboard so "clear view of hits and misses" is answerable
// at a glance, not just by reading every entry — counts every review
// entry ever logged, not scoped to the current symbol, since the point is
// tracking how Claude's calls hold up in aggregate over time.
const JournalScoreboard = ({ entries }: { entries: JournalEntry[] }) => {
  const counts: Record<ReviewVerdict, number> = {
    hit: 0,
    miss: 0,
    'missed-opportunity': 0,
    'dodged-trap': 0,
  };
  for (const entry of entries) {
    if (entry.kind === 'review') counts[entry.verdict]++;
  }
  const total = counts.hit + counts.miss + counts['missed-opportunity'] + counts['dodged-trap'];
  if (total === 0) return null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pb: 1.5 }}>
      {(Object.keys(counts) as ReviewVerdict[]).map((verdict) => {
        const Icon = VERDICT_ICON[verdict];
        return (
          <Chip
            key={verdict}
            icon={<Icon fontSize="small" />}
            label={`${counts[verdict]} ${VERDICT_LABEL[verdict].toLowerCase()}${counts[verdict] === 1 ? '' : 's'}`}
            size="small"
            color={VERDICT_COLOR[verdict]}
            variant="outlined"
          />
        );
      })}
    </Stack>
  );
};

const EntryMeta = ({ entry }: { entry: JournalEntry }) => (
  <Typography variant="caption" color="text.secondary">
    {formatTimestamp(entry.timestamp)}
  </Typography>
);

const NoteEntryCard = ({ entry }: { entry: Extract<JournalEntry, { kind: 'note' }> }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.25 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <NoteIcon fontSize="small" color="action" />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {entry.author === 'user' ? 'You' : 'Claude'}
      </Typography>
      {entry.symbol && <SymbolBadge symbol={entry.symbol} size="small" />}
      <EntryMeta entry={entry} />
    </Box>
    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{entry.text}</Typography>
  </Box>
);

const ReviewEntryCard = ({ entry }: { entry: Extract<JournalEntry, { kind: 'review' }> }) => {
  const Icon = VERDICT_ICON[entry.verdict];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <SymbolBadge symbol={entry.symbol} />
        <Chip
          icon={<Icon fontSize="small" />}
          label={VERDICT_LABEL[entry.verdict]}
          size="small"
          color={VERDICT_COLOR[entry.verdict]}
          variant="outlined"
        />
        <EntryMeta entry={entry} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.summary}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {entry.details}
      </Typography>
    </Box>
  );
};

const EntryCard = ({ entry }: { entry: JournalEntry }) => {
  switch (entry.kind) {
    case 'note':
      return <NoteEntryCard entry={entry} />;
    case 'review':
      return <ReviewEntryCard entry={entry} />;
  }
};

const sortedDesc = (entries: JournalEntry[]) =>
  [...entries].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

// The narrative record — freeform notes, plus how Claude's own calls
// held up against the market (review entries, graded hit/miss/
// missed-opportunity/dodged-trap) — distinct from Thesis (the current
// standing read), Ideas (a live proposal), and Portfolio (actual account
// state: real positions and cash — not narrative). Written directly by
// Claude in conversation, same convention as Thesis/Strategy — no skill
// run required, and no in-app entry form here.
//
// One flat reverse-chronological feed, symbols interlaced — each entry
// already carries its own SymbolBadge, so grouping by symbol would just
// be redundant sectioning on top of that. Unlike Levels (a current-state
// table where grouping by symbol reads naturally), this is a feed of
// things that happened over time, so time order is the right primary axis.
export const JournalPanel: React.FC<JournalPanelProps> = ({ journal }) => {
  if (journal.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No journal entries yet — tell Claude a note worth remembering, or ask it to review how a past
        thesis or alert played out.
      </Typography>
    );
  }

  return (
    <Box>
      <JournalScoreboard entries={journal} />
      {sortedDesc(journal).map((entry, i) => (
        <React.Fragment key={entry.id}>
          {i > 0 && <Divider />}
          <EntryCard entry={entry} />
        </React.Fragment>
      ))}
    </Box>
  );
};
