import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  Slider,
} from '@mui/material';
import {
  CheckCircle as HitIcon,
  Cancel as MissIcon,
  VisibilityOff as MissedOpportunityIcon,
  Shield as DodgedTrapIcon,
  EditNote as NoteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { JournalEntry, JournalEntryKind, ReviewVerdict, ReviewSourceType } from '../../types/Journal';
import { formatTimestamp } from '../../utils/formatters';
import { SymbolBadge } from '../SymbolBadge';
import { groupEntriesByDate, TimelineDateHeader, TimelineRow } from '../Timeline';

interface JournalPanelProps {
  journal: JournalEntry[];
  onAdd: (entry: JournalEntry) => void;
  onUpdate: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}

const VERDICT_COLOR: Record<ReviewVerdict, 'success' | 'error' | 'warning' | 'info'> = {
  hit: 'success',
  miss: 'error',
  'missed-opportunity': 'warning',
  'dodged-trap': 'info',
};

// Raw hex counterpart to VERDICT_COLOR — for the timeline dot, which
// takes a real CSS color, not an MUI chip color key.
const VERDICT_HEX: Record<ReviewVerdict, string> = {
  hit: '#4caf50',
  miss: '#f44336',
  'missed-opportunity': '#ff9800',
  'dodged-trap': '#29b6f6',
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

const SOURCE_TYPE_LABEL: Record<ReviewSourceType, string> = {
  thesis: 'Thesis',
  alert: 'Alert',
  idea: 'Idea',
};

const genId = () => `jrnl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Shared red-to-green read for a -1..1 sentiment value — used for both
// the meter's marker and the timeline dot, so "this entry's tone" always
// reads as the same color wherever it shows up.
const sentimentColor = (value: number) => (value > 0.15 ? '#4caf50' : value < -0.15 ? '#f44336' : '#9e9e9e');
const sentimentLabel = (value: number) =>
  value > 0.5 ? 'Very positive' : value > 0.15 ? 'Positive' : value < -0.5 ? 'Very negative' : value < -0.15 ? 'Negative' : 'Neutral';

// A small red→gray→green track with a marker at the entry's sentiment —
// deliberately a gradient meter, not a 3-icon bucket, since the whole
// point of a continuous scale is nuance a fixed icon set can't carry.
const SentimentMeter = ({ value }: { value: number }) => (
  <Tooltip title={`${sentimentLabel(value)} (${value >= 0 ? '+' : ''}${value.toFixed(1)})`}>
    <Box
      sx={{
        position: 'relative',
        width: 40,
        height: 6,
        borderRadius: 3,
        flexShrink: 0,
        background: 'linear-gradient(to right, #f44336, #9e9e9e, #4caf50)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: `${Math.max(0, Math.min(100, ((value + 1) / 2) * 100))}%`,
          top: '50%',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: sentimentColor(value),
          border: '1.5px solid',
          borderColor: 'background.paper',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </Box>
  </Tooltip>
);

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

// Shared trailing edit/delete controls — appended to the end of a card's
// header row (flexGrow spacer before them), same "controls live inline at
// the end of the row" convention as Alerts' collapse chevron, rather than
// absolutely-positioned icons that risk overlapping card content. Delete
// confirms via a small anchored menu (same MUI Menu already used for the
// chart settings dropdown elsewhere) rather than deleting on the first
// click — a journal entry can't be recovered once it's gone.
const EntryControls = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => {
  const [confirmAnchor, setConfirmAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="Edit">
        <IconButton size="small" onClick={onEdit} sx={{ p: 0.25 }}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" onClick={(e) => setConfirmAnchor(e.currentTarget)} sx={{ p: 0.25 }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={confirmAnchor}
        open={!!confirmAnchor}
        onClose={() => setConfirmAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 220 }}>
          <Typography variant="body2">Delete this entry?</Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => setConfirmAnchor(null)}>Cancel</Button>
            <Button
              size="small"
              color="error"
              variant="contained"
              onClick={() => {
                setConfirmAnchor(null);
                onDelete();
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Menu>
    </>
  );
};

const NoteEntryCard = ({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Extract<JournalEntry, { kind: 'note' }>;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <NoteIcon fontSize="small" color="action" />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {entry.author === 'user' ? 'You' : 'Claude'}
      </Typography>
      {entry.symbol && <SymbolBadge symbol={entry.symbol} size="small" />}
      {entry.sentiment != null && <SentimentMeter value={entry.sentiment} />}
      <EntryMeta entry={entry} />
      <EntryControls onEdit={onEdit} onDelete={onDelete} />
    </Box>
    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{entry.text}</Typography>
  </Box>
);

const ReviewEntryCard = ({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Extract<JournalEntry, { kind: 'review' }>;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const Icon = VERDICT_ICON[entry.verdict];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <SymbolBadge symbol={entry.symbol} />
        <Chip
          icon={<Icon fontSize="small" />}
          label={VERDICT_LABEL[entry.verdict]}
          size="small"
          color={VERDICT_COLOR[entry.verdict]}
          variant="outlined"
        />
        {entry.sentiment != null && <SentimentMeter value={entry.sentiment} />}
        <EntryMeta entry={entry} />
        <EntryControls onEdit={onEdit} onDelete={onDelete} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.summary}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {entry.details}
      </Typography>
    </Box>
  );
};

// One form for both adding (kind is pickable) and editing (kind fixed to
// the entry's own — switching kind on an existing entry would just be a
// delete-and-recreate, not a real edit). Timestamp isn't editable here —
// it's the "when this was written" record, managed automatically.
const EntryForm = ({
  initialEntry,
  onSave,
  onCancel,
}: {
  initialEntry?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
}) => {
  const [kind, setKind] = useState<JournalEntryKind>(initialEntry?.kind ?? 'note');
  const [author, setAuthor] = useState<'user' | 'claude'>(
    initialEntry?.kind === 'note' ? initialEntry.author : 'user'
  );
  const [text, setText] = useState(initialEntry?.kind === 'note' ? initialEntry.text : '');
  const [symbol, setSymbol] = useState(initialEntry?.symbol ?? '');
  const [verdict, setVerdict] = useState<ReviewVerdict>(
    initialEntry?.kind === 'review' ? initialEntry.verdict : 'hit'
  );
  const [summary, setSummary] = useState(initialEntry?.kind === 'review' ? initialEntry.summary : '');
  const [details, setDetails] = useState(initialEntry?.kind === 'review' ? initialEntry.details : '');
  const [sourceType, setSourceType] = useState<ReviewSourceType | ''>(
    initialEntry?.kind === 'review' ? initialEntry.sourceType ?? '' : ''
  );
  const [sentimentEnabled, setSentimentEnabled] = useState(initialEntry?.sentiment != null);
  const [sentiment, setSentiment] = useState(initialEntry?.sentiment ?? 0);

  const canSave =
    kind === 'note' ? text.trim().length > 0 : symbol.trim().length > 0 && summary.trim().length > 0 && details.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const id = initialEntry?.id ?? genId();
    const timestamp = initialEntry?.timestamp ?? new Date().toISOString();
    const sentimentValue = sentimentEnabled ? sentiment : undefined;
    if (kind === 'note') {
      onSave({
        id,
        kind: 'note',
        timestamp,
        symbol: symbol.trim() ? symbol.trim().toUpperCase() : undefined,
        sentiment: sentimentValue,
        author,
        text: text.trim(),
      });
    } else {
      onSave({
        id,
        kind: 'review',
        timestamp,
        symbol: symbol.trim().toUpperCase(),
        sentiment: sentimentValue,
        verdict,
        summary: summary.trim(),
        details: details.trim(),
        sourceType: sourceType || undefined,
      });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.25,
        my: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      {!initialEntry && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={kind}
          onChange={(_, v) => v && setKind(v)}
        >
          <ToggleButton value="note">Note</ToggleButton>
          <ToggleButton value="review">Review</ToggleButton>
        </ToggleButtonGroup>
      )}

      {kind === 'note' ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <ToggleButtonGroup size="small" exclusive value={author} onChange={(_, v) => v && setAuthor(v)}>
              <ToggleButton value="user">You</ToggleButton>
              <ToggleButton value="claude">Claude</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              size="small"
              label="Symbol (optional)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              sx={{ width: 140 }}
            />
          </Box>
          <TextField
            size="small"
            label="Note"
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={2}
            autoFocus
          />
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              sx={{ width: 110 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Verdict</InputLabel>
              <Select label="Verdict" value={verdict} onChange={(e) => setVerdict(e.target.value as ReviewVerdict)}>
                {(Object.keys(VERDICT_LABEL) as ReviewVerdict[]).map((v) => (
                  <MenuItem key={v} value={v}>{VERDICT_LABEL[v]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Source</InputLabel>
              <Select
                label="Source"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as ReviewSourceType | '')}
              >
                <MenuItem value="">—</MenuItem>
                {(Object.keys(SOURCE_TYPE_LABEL) as ReviewSourceType[]).map((s) => (
                  <MenuItem key={s} value={s}>{SOURCE_TYPE_LABEL[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TextField size="small" label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} autoFocus />
          <TextField
            size="small"
            label="Details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            multiline
            minRows={2}
          />
        </>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          label={sentimentEnabled ? 'Sentiment' : 'Add sentiment'}
          size="small"
          variant={sentimentEnabled ? 'filled' : 'outlined'}
          clickable
          onClick={() => setSentimentEnabled((v) => !v)}
        />
        {sentimentEnabled && (
          <>
            <Slider
              size="small"
              value={sentiment}
              onChange={(_, v) => setSentiment(v as number)}
              min={-1}
              max={1}
              step={0.1}
              sx={{ width: 110, color: sentimentColor(sentiment) }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 30 }}>
              {sentiment >= 0 ? '+' : ''}
              {sentiment.toFixed(1)}
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={onCancel}>Cancel</Button>
        <Button size="small" variant="contained" disabled={!canSave} onClick={handleSave}>Save</Button>
      </Box>
    </Box>
  );
};

const sortedDesc = (entries: JournalEntry[]) =>
  [...entries].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

// The narrative record — freeform notes, plus how Claude's own calls
// held up against the market (review entries, graded hit/miss/
// missed-opportunity/dodged-trap) — distinct from Thesis (the current
// standing read), Ideas (a live proposal), and Portfolio (actual account
// state: real positions and cash — not narrative). Usually kept up to
// date by Claude directly in conversation, but fully editable here too —
// add, edit, or delete any entry by hand.
//
// Rendered as a timeline, grouped by calendar date — symbols interlaced
// within each day, each entry already carrying its own SymbolBadge so
// grouping by symbol would just be redundant sectioning on top of that.
export const JournalPanel: React.FC<JournalPanelProps> = ({ journal, onAdd, onUpdate, onDelete }) => {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (entry: JournalEntry) => {
    onAdd(entry);
    setAdding(false);
  };

  const handleUpdate = (entry: JournalEntry) => {
    onUpdate(entry);
    setEditingId(null);
  };

  const dotColor = (entry: JournalEntry): string => {
    if (entry.kind === 'review') return VERDICT_HEX[entry.verdict];
    if (entry.sentiment != null) return sentimentColor(entry.sentiment);
    return '#9e9e9e';
  };

  const groups = groupEntriesByDate(sortedDesc(journal), (e) => e.timestamp);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <JournalScoreboard entries={journal} />
        {!adding && (
          <Tooltip title="Add entry">
            <IconButton size="small" onClick={() => setAdding(true)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {adding && <EntryForm onSave={handleAdd} onCancel={() => setAdding(false)} />}

      {journal.length === 0 && !adding ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No journal entries yet — add one, tell Claude a note worth remembering, or ask it to review how
          a past thesis or alert played out.
        </Typography>
      ) : (
        groups.map((group) => (
          <React.Fragment key={group.key}>
            <TimelineDateHeader label={group.label} />
            {group.items.map((entry) =>
              entry.id === editingId ? (
                <TimelineRow key={entry.id} color={dotColor(entry)}>
                  <EntryForm initialEntry={entry} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
                </TimelineRow>
              ) : (
                <TimelineRow key={entry.id} color={dotColor(entry)}>
                  {entry.kind === 'note' ? (
                    <NoteEntryCard
                      entry={entry}
                      onEdit={() => setEditingId(entry.id)}
                      onDelete={() => onDelete(entry.id)}
                    />
                  ) : (
                    <ReviewEntryCard
                      entry={entry}
                      onEdit={() => setEditingId(entry.id)}
                      onDelete={() => onDelete(entry.id)}
                    />
                  )}
                </TimelineRow>
              )
            )}
          </React.Fragment>
        ))
      )}
    </Box>
  );
};
