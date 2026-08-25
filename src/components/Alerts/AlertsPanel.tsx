import React, { useState } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Collapse, Divider } from '@mui/material';
import {
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  InfoOutlined as InfoIcon,
  Schedule as PendingIcon,
  Bolt as TriggeredIcon,
  Block as InvalidatedIcon,
  SwapHoriz as SupersededIcon,
  HourglassEmpty as ExpiredIcon,
  CandlestickChart as TimeframeIcon,
} from '@mui/icons-material';
import { Alert, AlertAction, AlertCondition, AlertSeverity, AlertStatus, TradeSuggestion } from '../../types/Alert';
import { Direction } from '../../constants/direction';
import { formatTimestamp, formatRelativeTime, formatPrice } from '../../utils/formatters';
import { SymbolBadge } from '../SymbolBadge';

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

const severityColor: Record<AlertSeverity, 'warning' | 'error'> = {
  watch: 'warning',
  action: 'error',
};

// Same palette as severityColor, expressed as an sx-compatible token —
// used for the card's left accent bar so priority is readable at a glance
// without having to parse a chip's text.
const severityAccentColor: Record<AlertSeverity, string> = {
  watch: 'warning.main',
  action: 'error.main',
};

const severityLabel: Record<AlertSeverity, string> = {
  watch: 'Watch',
  action: 'Action',
};

// Deliberately never green/red — those are reserved for bias (bullish/
// bearish) below. Status is "where in its lifecycle," not a directional
// read, and sharing bias's success/error colors was exactly what made
// e.g. "triggered" and "bullish" look like the same chip at a glance.
// Filled (vs. bias's outlined) and a non-trending icon set reinforce the
// same distinction visually, not just by color.
const statusColor: Record<AlertStatus, 'default' | 'info'> = {
  pending: 'default',
  triggered: 'info',
  invalidated: 'default',
  superseded: 'default',
  expired: 'default',
};

const statusLabel: Record<AlertStatus, string> = {
  pending: 'watching',
  triggered: 'triggered',
  invalidated: 'invalidated',
  superseded: 'superseded',
  expired: 'expired',
};

const STATUS_ICON: Record<AlertStatus, React.ElementType> = {
  pending: PendingIcon,
  triggered: TriggeredIcon,
  invalidated: InvalidatedIcon,
  superseded: SupersededIcon,
  expired: ExpiredIcon,
};

// Same bullish/bearish/neutral read as candlestick patterns elsewhere in
// the app, mapped onto MUI's chip palette instead of a raw hex (this chip
// uses semantic color slots, unlike the chart overlays). Outlined +
// trending icons, kept visually distinct from status above.
const biasColor: Record<Direction, 'success' | 'error' | 'default'> = {
  bullish: 'success',
  bearish: 'error',
  neutral: 'default',
};

const BIAS_ICON: Record<Direction, React.ElementType> = {
  bullish: TrendingUpIcon,
  bearish: TrendingDownIcon,
  neutral: TrendingFlatIcon,
};

// Raw sx-path counterpart to biasColor — `${biasColor[bias]}.main` breaks
// for neutral since MUI has no `default.main` palette entry; this is what
// the action banner and "if triggered" highlight actually use.
const biasAccentColor: Record<Direction, string> = {
  bullish: 'success.main',
  bearish: 'error.main',
  neutral: 'text.secondary',
};

// Shared by the legend and the real alert rows — one definition, so they
// can't drift apart the way describing the styling in prose would risk.
const StatusChip = ({ status }: { status: AlertStatus }) => {
  const Icon = STATUS_ICON[status];
  return (
    <Chip
      icon={<Icon fontSize="small" />}
      label={statusLabel[status]}
      size="small"
      color={statusColor[status]}
      variant="filled"
    />
  );
};

const BiasChip = ({ bias }: { bias: Direction }) => {
  const Icon = BIAS_ICON[bias];
  return (
    <Chip icon={<Icon fontSize="small" />} label={bias} size="small" color={biasColor[bias]} variant="outlined" />
  );
};

const SeverityChip = ({ severity }: { severity: AlertSeverity }) => (
  <Chip label={severityLabel[severity]} size="small" color={severityColor[severity]} sx={{ fontWeight: 700 }} />
);

// Which candle timeframe the condition actually evaluates on — plain
// gray, monospace-ish interval code (1m/5m/15m/1h/1d/1w), with a
// candlestick icon so it reads unambiguously as "this is a chart
// timeframe" rather than an age or a count. Kept deliberately the
// plainest-looking chip of the four families so it never competes with
// severity/status/bias for attention; it's context, not a judgment call.
const TimeframeChip = ({ timeframe }: { timeframe: string }) => (
  <Chip
    icon={<TimeframeIcon fontSize="small" />}
    label={timeframe}
    size="small"
    variant="outlined"
    sx={{ color: 'text.secondary', borderColor: 'divider', fontFamily: 'monospace' }}
  />
);

// The actual call to action — deliberately separate from `bias` (see
// AlertAction's doc comment in types/Alert.ts): a bearish read doesn't
// always mean "short."
const actionLabel: Record<AlertAction, string> = {
  long: 'Go Long',
  short: 'Go Short',
  exit: 'Exit Position',
  watch: 'Watch Only',
};

// One readable line for the raw technical trigger — the "way to see the
// technical conditions" ask, kept separate from headline/rationale/
// actionGuidance so the panel leads with plain-language meaning by default.
function formatCondition(c: AlertCondition): string {
  switch (c.kind) {
    case 'price-crosses':
      return `${c.timeframe} price crosses ${c.direction} $${c.level}`;
    case 'indicator-crosses':
      return `${c.timeframe} ${c.fast} crosses ${c.direction === 'bullish' ? 'above' : 'below'} ${c.slow}`;
    case 'macd-crosses-signal':
      return `${c.timeframe} MACD crosses ${c.direction === 'bullish' ? 'above' : 'below'} signal`;
    case 'indicator-threshold':
      return `${c.timeframe} ${c.indicator} crosses ${c.comparator} ${c.value}`;
  }
}

// "715C exp Aug 28" / "715P" / "Shares" — succinct enough to sit inline
// in a compact row without wrapping.
function formatSuggestionInstrument(s: TradeSuggestion): string {
  if (s.instrument === 'shares') return 'Shares';
  const side = s.instrument === 'call' ? 'C' : 'P';
  const strike = s.strike ?? '?';
  // Parse the date-only ISO string as local calendar components, not
  // through `new Date(str)` — that reads it as UTC midnight, which shifts
  // a day earlier in any timezone behind UTC (e.g. "2026-08-28" → "Aug 27").
  const expiry = s.expiry
    ? (() => {
        const [y, m, d] = s.expiry!.split('-').map(Number);
        return ` exp ${new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      })()
    : '';
  return `${strike}${side}${expiry}`;
}

// One concrete, ready-to-act-on expression of an alert's action — see
// TradeSuggestion. `target` is genuinely absent (not zero, not omitted
// display) when no structural level supports one yet, per strategy's
// never-fabricate-a-level discipline — shown as "no fixed target" rather
// than a blank or a made-up number.
const SuggestionRow = ({ suggestion }: { suggestion: TradeSuggestion }) => (
  <Box sx={{ mt: 0.5 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Chip
        label={formatSuggestionInstrument(suggestion)}
        size="small"
        variant="outlined"
        sx={{ fontFamily: 'monospace', fontWeight: 700 }}
      />
      <Typography variant="caption">Entry {formatPrice(suggestion.entry)}</Typography>
      <Typography variant="caption" color="text.secondary">→</Typography>
      {suggestion.target != null ? (
        <Typography variant="caption">Target {formatPrice(suggestion.target)}</Typography>
      ) : (
        <Typography variant="caption" fontStyle="italic" color="text.secondary">no fixed target — trail</Typography>
      )}
      <Typography variant="caption" color="text.secondary">·</Typography>
      <Typography variant="caption">Stop {formatPrice(suggestion.stop)}</Typography>
      {suggestion.riskReward != null && (
        <Chip label={`${suggestion.riskReward.toFixed(1)}R`} size="small" />
      )}
    </Box>
    {suggestion.note && (
      <Typography variant="caption" color="text.secondary" fontStyle="italic" component="div" sx={{ pl: 1, mt: 0.25 }}>
        {suggestion.note}
      </Typography>
    )}
  </Box>
);

// A single legend row: the exact same chip/badge shown in a real alert,
// next to a plain-language explanation — reusing the real components
// rather than describing them in prose keeps this from silently drifting
// out of sync with what the panel actually renders.
const LegendRow = ({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box sx={{ minWidth: 96, display: 'flex' }}>{swatch}</Box>
    <Typography variant="caption" color="text.secondary">{children}</Typography>
  </Box>
);

const AlertsLegend = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 1 }}>
    <Typography variant="overline" color="text.secondary">Severity</Typography>
    <LegendRow swatch={<SeverityChip severity="watch" />}>
      Informational — worth knowing, not necessarily worth acting on. Also shown as the card's left edge color.
    </LegendRow>
    <LegendRow swatch={<SeverityChip severity="action" />}>
      Higher priority — this one's built around a real decision point.
    </LegendRow>

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Status</Typography>
    {(Object.keys(statusLabel) as AlertStatus[]).map((status) => (
      <LegendRow key={status} swatch={<StatusChip status={status} />}>
        {status === 'pending' && "The condition hasn't happened yet — being watched live."}
        {status === 'triggered' && 'The condition just became true.'}
        {status === 'invalidated' && "The competing scenario happened first — this one's off the table."}
        {status === 'superseded' && "Replaced by a fresher read before it ever triggered — don't act on it."}
        {status === 'expired' && "Its watch window passed without triggering."}
      </LegendRow>
    ))}

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Bias</Typography>
    {(Object.keys(BIAS_ICON) as Direction[]).map((bias) => (
      <LegendRow key={bias} swatch={<BiasChip bias={bias} />}>
        The directional read this alert represents.
      </LegendRow>
    ))}

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Timeframe</Typography>
    <LegendRow swatch={<TimeframeChip timeframe="1h" />}>
      Which candle timeframe the condition actually evaluates on.
    </LegendRow>

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Timestamp</Typography>
    <LegendRow swatch={<Typography variant="caption" color="text.secondary">triggered 9:51 AM</Typography>}>
      The actual clock time it triggered, once it has — not "how long ago," since that matters less than exactly when.
    </LegendRow>
    <LegendRow swatch={<Typography variant="caption" color="text.secondary">2h ago</Typography>}>
      How long ago it was created, while still untriggered — hover it for the exact time.
    </LegendRow>

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Call to action</Typography>
    <LegendRow
      swatch={
        <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'success.main', width: 'fit-content' }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#fff' }}>→ Go Long</Typography>
        </Box>
      }
    >
      Shown once triggered — bias alone doesn't imply this (a bearish read is often "watch," not "short").
    </LegendRow>
    <LegendRow
      swatch={
        <Box sx={{ px: 1, py: 0.25, borderRadius: 1, border: '1px dashed', borderColor: 'success.main', width: 'fit-content' }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: 'success.main' }}>if triggered → Go Long</Typography>
        </Box>
      }
    >
      Same call to action, shown ahead of time while still pending.
    </LegendRow>

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Trade suggestion</Typography>
    <LegendRow
      swatch={
        <Chip label="715C exp Aug 28" size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
      }
    >
      At least one concrete entry/target/stop for the action, when there's a real trade to make of it —
      strike/expiry for options, or plain shares.
    </LegendRow>

    <Typography variant="overline" color="text.secondary" sx={{ mt: 0.5 }}>Invalidation</Typography>
    <LegendRow swatch={<InvalidatedIcon fontSize="small" color="disabled" />}>
      The opposite side of the same setup — if it happens first, this alert resolves as "invalidated"
      automatically, live, instead of sitting there stale until its window times out.
    </LegendRow>
  </Box>
);

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [legendOpen, setLegendOpen] = useState(false);

  const legend = (
    <Box>
      <Box
        onClick={() => setLegendOpen((v) => !v)}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', px: 2, py: 0.5, color: 'text.secondary' }}
      >
        <InfoIcon fontSize="small" />
        <Typography variant="caption">what do these tags mean?</Typography>
        {legendOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>
      <Collapse in={legendOpen}>
        <Box sx={{ px: 2 }}>
          <AlertsLegend />
        </Box>
        <Divider sx={{ mb: 1 }} />
      </Collapse>
    </Box>
  );

  // Whichever timestamp is more relevant right now — a just-triggered
  // alert should jump to the top even if it sat pending for a while.
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.triggeredAt ?? b.createdAt).getTime() - new Date(a.triggeredAt ?? a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Box>
        {legend}
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No alerts yet.
        </Typography>
      </Box>
    );
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderAlert = (alert: Alert) => {
    const dimmed =
      alert.acknowledged ||
      alert.status === 'superseded' ||
      alert.status === 'expired' ||
      alert.status === 'invalidated';
    const isExpanded = expanded.has(alert.id);
    // A prominent banner only once it's actually triggered and there's a
    // real action to take — a pending "watch only" alert gets a quieter
    // inline hint instead (see below), not a banner competing for
    // attention before anything has actually happened.
    const showActionBanner = alert.status === 'triggered' && alert.action !== 'watch';
    return (
      <Box
        key={alert.id}
        sx={{
          position: 'relative',
          opacity: dimmed ? 0.55 : 1,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: '4px solid',
          borderLeftColor: severityAccentColor[alert.severity],
          borderRadius: 1,
          px: 1.5,
          py: 1,
          mb: 1,
        }}
      >
        {!alert.acknowledged && (
          <Tooltip title="Acknowledge">
            <IconButton
              size="small"
              onClick={() => onAcknowledge(alert.id)}
              sx={{ position: 'absolute', top: 6, right: 6 }}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Tier 1: what it is, at a glance — severity + symbol lead, time trails. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: alert.acknowledged ? 0 : 4 }}>
          <SeverityChip severity={alert.severity} />
          <SymbolBadge symbol={alert.symbol} />
          <Box sx={{ flexGrow: 1 }} />
          {alert.status === 'triggered' && alert.triggeredAt ? (
            <Typography variant="caption" color="text.secondary">
              triggered {formatTimestamp(alert.triggeredAt)}
            </Typography>
          ) : (
            <Tooltip title={formatTimestamp(alert.createdAt)}>
              <Typography variant="caption" color="text.secondary">
                {formatRelativeTime(alert.createdAt)}
              </Typography>
            </Tooltip>
          )}
        </Box>

        {/* Tier 2: the headline — the one sentence worth actually reading. */}
        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
          {alert.headline}
        </Typography>

        {/* Tier 3: secondary classification — demoted below the headline so
            it reads as supporting context, not competing with it. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          <StatusChip status={alert.status} />
          <BiasChip bias={alert.bias} />
          <TimeframeChip timeframe={alert.condition.timeframe} />
        </Box>

        {showActionBanner && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.75,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: biasAccentColor[alert.bias],
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color: '#fff' }}>
              → {actionLabel[alert.action]}
            </Typography>
          </Box>
        )}

        {/* Highlighted, not just a muted caption — this is a real trade
            plan waiting on confirmation, not a footnote. Dashed border
            reads as "not live yet" without looking like the solid banner
            above (which only shows once actually triggered). */}
        {alert.status === 'pending' && alert.action !== 'watch' && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.75,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              border: '1px dashed',
              borderColor: biasAccentColor[alert.bias],
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color: biasAccentColor[alert.bias] }}>
              if triggered → {actionLabel[alert.action]}
            </Typography>
          </Box>
        )}

        {alert.action !== 'watch' && alert.suggestions && alert.suggestions.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            {alert.suggestions.map((s, i) => (
              <SuggestionRow key={i} suggestion={s} />
            ))}
          </Box>
        )}

        {/* Tier 4: supporting prose — rationale reads as the main body text;
            actionGuidance is visually set apart (indent + rule) so the two
            don't blend into one undifferentiated paragraph. */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {alert.rationale}
        </Typography>
        <Box sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1, mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary" fontStyle="italic">
            {alert.actionGuidance}
          </Typography>
        </Box>
        {alert.status === 'pending' && alert.activeFrom && new Date(alert.activeFrom).getTime() > Date.now() && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            starts watching at{' '}
            {new Date(alert.activeFrom).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Typography>
        )}

        <Box
          onClick={() => toggleExpanded(alert.id)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mt: 0.75 }}
        >
          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          <Typography variant="caption" color="text.secondary">
            technical conditions
          </Typography>
        </Box>
        <Collapse in={isExpanded}>
          <Typography
            variant="caption"
            component="pre"
            sx={{ fontFamily: 'monospace', color: 'text.secondary', m: 0, whiteSpace: 'pre-wrap' }}
          >
            {formatCondition(alert.condition)}
          </Typography>
          {alert.invalidation && (
            <Typography
              variant="caption"
              component="pre"
              sx={{ fontFamily: 'monospace', color: 'text.secondary', m: 0, whiteSpace: 'pre-wrap' }}
            >
              invalidated if: {formatCondition(alert.invalidation)}
            </Typography>
          )}
        </Collapse>
      </Box>
    );
  };

  return (
    <Box>
      {legend}
      <Box sx={{ px: 2, pt: 0.5 }}>{sorted.map(renderAlert)}</Box>
    </Box>
  );
};
