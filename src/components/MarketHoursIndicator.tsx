import React, { useEffect, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
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

// The single dominant hue "emanating" from the indicator for each stage —
// night-navy for closed, dawn orange for pre-market, bright daylight blue
// for the open session, sunset orange-purple for after-hours. Doubles as
// both the background glow's core color and the pill's own translucent
// tint, so the pill reads as the actual light source, not just a label
// sitting on top of it.
const SESSION_GLOW: Record<MarketSession, string> = {
  closed: '#1b2a6b',
  premarket: '#ff8a65',
  open: '#4fc3f7',
  afterhours: '#ff7043',
};

// Light pill fills (open) read better with dark text; the rest are dark
// enough for white text even at low opacity.
const SESSION_TEXT_COLOR: Record<MarketSession, string> = {
  closed: '#fff',
  premarket: '#fff',
  open: '#1a1a1a',
  afterhours: '#fff',
};

// Cycling order for the click-to-preview testing affordance below.
const SESSION_CYCLE: MarketSession[] = ['closed', 'premarket', 'open', 'afterhours'];

// A large, soft, fixed radial glow behind the entire app, centered where
// the indicator sits (top-center) — the actual "day/night lighting
// effect," rather than confined to the indicator's own small shape. Sits
// behind normal page content (negative z-index on a `position: fixed`
// layer paints behind the default stacking layer normal content occupies)
// and shows through wherever the header/panels are translucent (see
// their own `alpha(...)` backgrounds in App.tsx) rather than being fully
// hidden behind them.
const GlowBackground = ({ session }: { session: MarketSession }) => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      pointerEvents: 'none',
      transition: 'background 1s ease',
      background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${SESSION_GLOW[session]}55 0%, transparent 70%)`,
    }}
  />
);

// Which of the four discrete trading-day stages "now" is in, in real ET
// wall-clock time independent of the browser's own timezone (see
// utils/marketHours). Rendered as a translucent pill that floats straddling
// the app header's bottom edge — the wrapper itself takes up zero layout
// height (`position: relative; height: 0`), so the header and side panel
// still butt directly against each other; the pill is purely an absolutely
// positioned overlay on top, not a layout row anything else has to make
// room for. Clicking it cycles through all four stages for testing/preview
// purposes, then back to the real live reading — see `override` below.
export const MarketHoursIndicator: React.FC = () => {
  const [now, setNow] = useState(() => Date.now());
  // null = following the real clock; a value = previewing that stage
  // instead, for testing what each looks like without waiting for it.
  const [override, setOverride] = useState<MarketSession | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const liveSession = getMarketSession(now);
  const session = override ?? liveSession;

  const handleClick = () => {
    const currentIndex = override ? SESSION_CYCLE.indexOf(override) : -1;
    const nextIndex = currentIndex + 1;
    setOverride(nextIndex >= SESSION_CYCLE.length ? null : SESSION_CYCLE[nextIndex]);
  };

  return (
    <>
      <GlowBackground session={session} />
      <Box sx={{ position: 'relative', height: 0 }}>
        <Tooltip title="Click to preview each session stage (testing)">
          <Box
            onClick={handleClick}
            sx={{
              position: 'absolute',
              top: -16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: (theme) => theme.zIndex.appBar + 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.4,
              borderRadius: 5,
              bgcolor: `${SESSION_GLOW[session]}40`,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              cursor: 'pointer',
              userSelect: 'none',
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
            <Typography variant="caption" sx={{ color: SESSION_TEXT_COLOR[session], opacity: 0.85 }}>
              · {getEtClockLabel(now)}
            </Typography>
            {override && (
              <Typography
                variant="caption"
                fontStyle="italic"
                sx={{ color: SESSION_TEXT_COLOR[session], opacity: 0.7 }}
              >
                (preview)
              </Typography>
            )}
          </Box>
        </Tooltip>
      </Box>
    </>
  );
};
