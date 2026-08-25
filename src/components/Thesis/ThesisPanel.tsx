import React, { useState } from 'react';
import { Box, Typography, Chip, Divider, Tooltip, ButtonBase } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { Thesis, Stance } from '../../types/Thesis';
import { Direction } from '../../constants/direction';
import { partitionBySymbol } from '../../utils/bySymbol';
import { formatRelativeTime, formatTimestamp } from '../../utils/formatters';
import { SymbolBadge } from '../SymbolBadge';
import { PanelSectionHeader } from '../Sidebar/PanelSectionHeader';

interface ThesisPanelProps {
  thesis: Thesis[];
  currentSymbol: string;
  multiSymbol: boolean;
}

const sentimentColor: Record<Direction, 'success' | 'error' | 'default'> = {
  bullish: 'success',
  bearish: 'error',
  neutral: 'default',
};

const SENTIMENT_ICON: Record<Direction, React.ElementType> = {
  bullish: TrendingUpIcon,
  bearish: TrendingDownIcon,
  neutral: TrendingFlatIcon,
};

// SvgIcon's `color` prop doesn't accept 'default' the way Chip's does —
// this is the icon-safe counterpart to sentimentColor above.
const sentimentIconColor: Record<Direction, 'success' | 'error' | 'disabled'> = {
  bullish: 'success',
  bearish: 'error',
  neutral: 'disabled',
};

// Long/hold read as the same color family as the matching sentiment would
// (long=green, short=red) — hold is neutral gray since it's deliberately
// not a directional call either way.
const stanceColor: Record<Stance, string> = {
  long: 'success.main',
  short: 'error.main',
  hold: 'action.selected',
};

const stanceTextColor: Record<Stance, string> = {
  long: '#fff',
  short: '#fff',
  hold: 'text.secondary',
};

const stanceLabel: Record<Stance, string> = {
  long: 'Long',
  short: 'Short',
  hold: 'Hold',
};

const ThesisCard = ({ item }: { item: Thesis }) => {
  const SentimentIcon = SENTIMENT_ICON[item.sentiment];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <SymbolBadge symbol={item.symbol} />
        <Chip
          icon={<SentimentIcon fontSize="small" />}
          label={item.sentiment}
          size="small"
          color={sentimentColor[item.sentiment]}
          variant="outlined"
        />
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: stanceColor[item.stance],
          }}
        >
          <Typography variant="caption" fontWeight={700} sx={{ color: stanceTextColor[item.stance] }}>
            {stanceLabel[item.stance]}
          </Typography>
        </Box>
        <Tooltip title={formatTimestamp(item.updatedAt)}>
          <Typography variant="caption" color="text.secondary">{formatRelativeTime(item.updatedAt)}</Typography>
        </Tooltip>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.summary}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {item.reasoning}
      </Typography>
      {item.invalidation && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, fontStyle: 'italic' }}>
          What would change this: {item.invalidation}
        </Typography>
      )}
    </Box>
  );
};

// A single past reading — compact, one line, no full reasoning repeated
// (the current ThesisCard above already carries that level of detail).
// This is for seeing how the read evolved, not re-reading every past
// write-up in full.
const HistoryRow = ({ item }: { item: Thesis }) => {
  const SentimentIcon = SENTIMENT_ICON[item.sentiment];
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75 }}>
      <SentimentIcon fontSize="small" color={sentimentIconColor[item.sentiment]} sx={{ mt: '2px' }} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {stanceLabel[item.stance]}
          </Typography>
          <Tooltip title={formatTimestamp(item.updatedAt)}>
            <Typography variant="caption" color="text.secondary">{formatRelativeTime(item.updatedAt)}</Typography>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
          {item.summary}
        </Typography>
      </Box>
    </Box>
  );
};

// Latest entry (by updatedAt) leads as the current read; everything older
// for that symbol collapses below it as history — collapsed by default
// so a symbol with a long history doesn't dominate the panel, same
// "detail is one click away, not up front" discipline as Alerts'
// technical-conditions toggle.
const ThesisGroup = ({ latest, history }: { latest: Thesis; history: Thesis[] }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box sx={{ py: 0.5 }}>
      <ThesisCard item={latest} />
      {history.length > 0 && (
        <>
          <ButtonBase
            onClick={() => setExpanded((v) => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mb: expanded ? 0.5 : 0 }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            <Typography variant="caption">
              {history.length} past reading{history.length === 1 ? '' : 's'}
            </Typography>
          </ButtonBase>
          {expanded && (
            <Box sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
              {history.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i > 0 && <Divider />}
                  <HistoryRow item={item} />
                </React.Fragment>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

interface SymbolGroup {
  symbol: string;
  latest: Thesis;
  history: Thesis[];
}

function groupBySymbol(thesis: Thesis[]): SymbolGroup[] {
  const bySymbol = new Map<string, Thesis[]>();
  for (const t of thesis) {
    const arr = bySymbol.get(t.symbol) ?? [];
    arr.push(t);
    bySymbol.set(t.symbol, arr);
  }
  return [...bySymbol.entries()].map(([symbol, items]) => {
    const sorted = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return { symbol, latest: sorted[0], history: sorted.slice(1) };
  });
}

// The standing market read per symbol, plus how it's evolved over time —
// distinct from Ideas (concrete, expiring entry/stop/target proposals)
// and Alerts (one-shot triggers). This is closer to running commentary:
// what's the current thesis, why, what would change it, and what it used
// to say. Written directly by Claude in conversation (same as Strategy —
// no skill run required) and kept fresh by find-trades' own
// market-structure read where relevant. Append-only on the data side —
// see src/types/Thesis.ts.
export const ThesisPanel: React.FC<ThesisPanelProps> = ({ thesis, currentSymbol, multiSymbol }) => {
  if (thesis.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No thesis yet — ask Claude for a read on the current price action and market structure.
      </Typography>
    );
  }

  const groups = groupBySymbol(thesis);
  const { current, other } = partitionBySymbol(groups, (g) => g.symbol, currentSymbol);

  return (
    <Box>
      {multiSymbol && <PanelSectionHeader>{currentSymbol}</PanelSectionHeader>}
      {current.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          No thesis for {currentSymbol} yet.
        </Typography>
      ) : (
        current.map((group, i) => (
          <React.Fragment key={group.symbol}>
            {i > 0 && <Divider />}
            <ThesisGroup latest={group.latest} history={group.history} />
          </React.Fragment>
        ))
      )}
      {other.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <PanelSectionHeader>Other Watchlist Symbols</PanelSectionHeader>
          {other.map((group) => (
            <React.Fragment key={group.symbol}>
              <Divider />
              <ThesisGroup latest={group.latest} history={group.history} />
            </React.Fragment>
          ))}
        </>
      )}
    </Box>
  );
};
