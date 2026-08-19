import React from 'react';
import { Box, Typography, Chip, Divider } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { Thesis, Stance } from '../../types/Thesis';
import { Direction } from '../../constants/direction';
import { partitionBySymbol } from '../../utils/bySymbol';

interface ThesisPanelProps {
  thesis: Thesis[];
  currentSymbol: string;
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

const formatAge = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const ThesisCard = ({ item }: { item: Thesis }) => {
  const SentimentIcon = SENTIMENT_ICON[item.sentiment];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" fontWeight="bold">{item.symbol}</Typography>
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
        <Typography variant="caption" color="text.secondary">{formatAge(item.updatedAt)}</Typography>
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

// The standing market read per symbol — distinct from Ideas (concrete,
// expiring entry/stop/target proposals) and Alerts (one-shot triggers).
// This is closer to running commentary: what's the current thesis, why,
// and what would change it. Written directly by Claude in conversation
// (same as Strategy — no skill run required) and kept fresh by
// find-trades' own market-structure read where relevant.
export const ThesisPanel: React.FC<ThesisPanelProps> = ({ thesis, currentSymbol }) => {
  if (thesis.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No thesis yet — ask Claude for a read on the current price action and market structure.
      </Typography>
    );
  }

  const { current, other } = partitionBySymbol(thesis, (t) => t.symbol, currentSymbol);

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{currentSymbol}</Typography>
      {current.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          No thesis for {currentSymbol} yet.
        </Typography>
      ) : (
        current.map((item, i) => (
          <React.Fragment key={item.symbol}>
            {i > 0 && <Divider />}
            <ThesisCard item={item} />
          </React.Fragment>
        ))
      )}
      {other.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="overline" color="text.secondary">Other Watchlist Symbols</Typography>
          {other.map((item) => (
            <React.Fragment key={item.symbol}>
              <Divider />
              <ThesisCard item={item} />
            </React.Fragment>
          ))}
        </>
      )}
    </Box>
  );
};
