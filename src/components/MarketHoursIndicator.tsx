import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getMarketSession, getEtClockLabel, MarketSession } from '../utils/marketHours';

const SESSION_EMOJI: Record<MarketSession, string> = {
  closed: '🌙',
  premarket: '🌅',
  open: '☀️',
  afterhours: '🌆',
};

const SESSION_LABEL: Record<MarketSession, string> = {
  closed: 'Market Closed',
  premarket: 'Pre-Market',
  open: 'Market Open',
  afterhours: 'After Hours',
};

// A day/night "lighting" gradient per stage — night-navy for closed,
// dawn for pre-market, bright sky for the open session, sunset for
// after-hours — so the stage reads at a glance from color alone, the
// emoji and label are just confirmation, not the only signal.
const SESSION_GRADIENT: Record<MarketSession, string> = {
  closed: 'linear-gradient(90deg, #0d1321, #1b2a4a)',
  premarket: 'linear-gradient(90deg, #2b2d5e, #ff8a65)',
  open: 'linear-gradient(90deg, #4fc3f7, #fff59d)',
  afterhours: 'linear-gradient(90deg, #ff7043, #4a148c)',
};

// Light backgrounds (open) read better with dark text; the rest are dark
// enough for white text throughout the gradient.
const SESSION_TEXT_COLOR: Record<MarketSession, string> = {
  closed: '#fff',
  premarket: '#fff',
  open: '#1a1a1a',
  afterhours: '#fff',
};

// Small centered pill under the app header — which of the four discrete
// trading-day stages "now" is in, in real ET wall-clock time regardless
// of the browser's own timezone (see utils/marketHours). Purely
// informational context for reading the chart (e.g. thin premarket/
// after-hours volume vs. a live regular session) — not tied to any
// symbol or data fetch, just the clock.
export const MarketHoursIndicator: React.FC = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const session = getMarketSession(now);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.4,
          borderRadius: 5,
          background: SESSION_GRADIENT[session],
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }}
      >
        <Typography component="span" sx={{ fontSize: '0.95rem', lineHeight: 1 }}>
          {SESSION_EMOJI[session]}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: SESSION_TEXT_COLOR[session], letterSpacing: 0.3 }}
        >
          {SESSION_LABEL[session]}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: SESSION_TEXT_COLOR[session], opacity: 0.8 }}
        >
          · {getEtClockLabel(now)}
        </Typography>
      </Box>
    </Box>
  );
};
