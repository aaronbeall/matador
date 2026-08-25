import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Chip, Divider, Stack, IconButton, Tooltip } from '@mui/material';
import {
  TrendingUp as LongIcon,
  TrendingDown as ShortIcon,
  AccountBalanceWallet as CashIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip as RechartsTooltip } from 'recharts';
import { Position, AccountBalance } from '../../types/Portfolio';
import { formatPrice, formatTimestamp, formatRelativeTime, formatDelta } from '../../utils/formatters';
import { CHART_COLORS } from '../../constants/colors';
import { getQuote } from '../../services/dataApi';
import { SymbolBadge } from '../SymbolBadge';
import { groupEntriesByDate, TimelineDateHeader, TimelineRow, TimelineTime } from '../Timeline';

interface PortfolioPanelProps {
  positions: Position[];
  balances: AccountBalance[];
}

const instrumentLabel = (p: Position) =>
  p.instrument === 'shares'
    ? `${p.quantity} sh`
    : `${p.quantity}x ${p.strike ?? '?'} ${p.instrument}${p.expiry ? ` exp ${p.expiry}` : ''}`;

// Cash on hand — the whole point of this section is a number you can
// trust at a glance, so total leads; a per-account breakdown only shows
// once there's more than one account to actually break down.
const CashSummary = ({ balances }: { balances: AccountBalance[] }) => {
  if (balances.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ pb: 1.5 }}>
        No account balance on file — tell the agent your current cash balance to start tracking it.
      </Typography>
    );
  }
  const total = balances.reduce((sum, b) => sum + b.cash, 0);
  const mostRecent = balances.reduce((latest, b) => (b.asOf > latest ? b.asOf : latest), balances[0].asOf);
  return (
    <Box sx={{ pb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <CashIcon fontSize="small" color="action" />
        <Typography variant="h6" fontWeight={700}>{formatPrice(total)}</Typography>
        <Typography variant="caption" color="text.secondary">cash available</Typography>
      </Box>
      {balances.length > 1 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
          {balances.map((b) => (
            <Chip key={b.account} label={`${b.account}: ${formatPrice(b.cash)}`} size="small" variant="outlined" />
          ))}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">{balances[0].account}</Typography>
      )}
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
        as of {formatRelativeTime(mostRecent)}
      </Typography>
    </Box>
  );
};

const PLStat = ({ label, value, loading }: { label: string; value: number | null; loading?: boolean }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
    {loading ? (
      <Typography variant="body1" fontWeight={700} color="text.secondary">…</Typography>
    ) : value == null ? (
      <Typography variant="body1" color="text.secondary">—</Typography>
    ) : (
      <Typography
        variant="body1"
        fontWeight={700}
        sx={{ color: value >= 0 ? 'success.main' : 'error.main' }}
      >
        {formatDelta(value, formatPrice)}
      </Typography>
    )}
  </Box>
);

// Realized P&L (sum of closed positions' recorded realizedPL — never
// recomputed, just totaled) plus unrealized P&L on open SHARES positions,
// priced from a live quote fetched here. Open OPTIONS positions are
// deliberately excluded from unrealized — this app has no live
// options-chain data to price them from, so making up a number would be
// worse than just saying so.
const PnLSummary = ({ open, closed }: { open: Position[]; closed: Position[] }) => {
  const closedWithPL = closed.filter((p) => p.realizedPL != null);
  const realizedTotal = closedWithPL.reduce((sum, p) => sum + p.realizedPL!, 0);
  const wins = closedWithPL.filter((p) => p.realizedPL! >= 0).length;
  const losses = closedWithPL.length - wins;

  const openShares = open.filter((p) => p.instrument === 'shares');
  const openOptionsCount = open.length - openShares.length;
  const symbols = [...new Set(openShares.map((p) => p.symbol))];

  const [quotes, setQuotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const symbolsKey = symbols.join(',');

  const refreshQuotes = useCallback(async () => {
    if (!symbolsKey) {
      setQuotes({});
      return;
    }
    setLoading(true);
    const results = await Promise.all(
      symbolsKey.split(',').map(async (s) => [s, (await getQuote(s))?.c] as const)
    );
    setQuotes(Object.fromEntries(results.filter(([, c]) => c != null)) as Record<string, number>);
    setLoading(false);
  }, [symbolsKey]);

  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  let unrealizedTotal = 0;
  let unrealizedPriced = 0;
  for (const p of openShares) {
    const quote = quotes[p.symbol];
    if (quote == null) continue;
    unrealizedTotal += (p.direction === 'long' ? quote - p.entryPrice : p.entryPrice - quote) * p.quantity;
    unrealizedPriced++;
  }
  const hasUnrealized = openShares.length > 0;

  if (closedWithPL.length === 0 && openShares.length === 0 && openOptionsCount === 0) return null;

  // Cumulative realized P&L over time, by exit — the one thing genuinely
  // computable from what's actually been recorded, no live pricing needed.
  // Anchored with a real zero-baseline point at the first trade's own
  // entry time, so even a single closed trade draws an actual line (start
  // at 0, end at its P&L) instead of needing a second trade just to have
  // two points to connect.
  const sortedClosed = [...closedWithPL].sort((a, b) => (a.exitAt! < b.exitAt! ? -1 : 1));
  const chartData =
    sortedClosed.length === 0
      ? []
      : sortedClosed.reduce<{ date: string; cumulative: number }[]>(
          (acc, p) => {
            const prev = acc[acc.length - 1].cumulative;
            acc.push({ date: p.exitAt!, cumulative: prev + p.realizedPL! });
            return acc;
          },
          [{ date: sortedClosed[0].entryAt, cumulative: 0 }]
        );

  return (
    <Box sx={{ pb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <PLStat label="Realized P&L" value={closedWithPL.length > 0 ? realizedTotal : null} />
        {hasUnrealized && (
          <PLStat label="Unrealized P&L" value={unrealizedPriced > 0 ? unrealizedTotal : null} loading={loading} />
        )}
        {closedWithPL.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {wins}W / {losses}L
          </Typography>
        )}
        {hasUnrealized && (
          <Tooltip title="Refresh quotes">
            <IconButton size="small" onClick={refreshQuotes} sx={{ p: 0.25 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {openOptionsCount > 0 && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
          {openOptionsCount} open option position{openOptionsCount === 1 ? '' : 's'} not priced — no live
          options-chain data.
        </Typography>
      )}
      {chartData.length > 1 && (
        <Box sx={{ mt: 1, height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <ReferenceLine y={0} stroke="rgba(128,128,128,0.4)" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <RechartsTooltip
                formatter={(v: number) => formatPrice(v)}
                labelFormatter={(l: string) => formatTimestamp(l)}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke={realizedTotal >= 0 ? CHART_COLORS.priceUp : CHART_COLORS.priceDown}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

const PositionCard = ({ position, leadingTime }: { position: Position; leadingTime?: string }) => {
  const DirIcon = position.direction === 'long' ? LongIcon : ShortIcon;
  const plColor = position.realizedPL == null ? 'text.secondary' : position.realizedPL >= 0 ? 'success.main' : 'error.main';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.25 }}>
      {leadingTime && <TimelineTime>{formatTimestamp(leadingTime)}</TimelineTime>}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {!leadingTime && <DirIcon fontSize="small" color={position.direction === 'long' ? 'success' : 'error'} />}
        <SymbolBadge symbol={position.symbol} />
        <Chip label={`${position.direction} ${instrumentLabel(position)}`} size="small" variant="outlined" />
        {position.account && <Chip label={position.account} size="small" variant="outlined" />}
        {position.status === 'closed' && position.realizedPL != null && (
          <Typography variant="caption" fontWeight={700} sx={{ color: plColor }}>
            {position.realizedPL >= 0 ? '+' : ''}
            {formatPrice(position.realizedPL)}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Entry {formatPrice(position.entryPrice)} · {formatTimestamp(position.entryAt)}
        {position.status === 'closed' && position.exitPrice != null && position.exitAt
          ? ` — Exit ${formatPrice(position.exitPrice)} · ${formatTimestamp(position.exitAt)}`
          : ''}
      </Typography>
      {position.notes && (
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{position.notes}</Typography>
      )}
    </Box>
  );
};

const sortedDesc = (positions: Position[], key: (p: Position) => string) =>
  [...positions].sort((a, b) => (key(a) < key(b) ? 1 : -1));


// The one place that reflects only real account state — actual open/
// closed positions and actual cash, nothing analytical or speculative
// (that's Thesis/Ideas/Journal). Written directly by Claude in
// conversation whenever you relay a trade or a balance — see CLAUDE.md.
// Deliberately not scoped to the currently-charted symbol (unlike Alerts/
// Levels/Ideas/Journal) — this is an account-wide view, not a per-chart one.
export const PortfolioPanel: React.FC<PortfolioPanelProps> = ({ positions, balances }) => {
  const open = sortedDesc(positions.filter((p) => p.status === 'open'), (p) => p.entryAt);
  const closed = sortedDesc(positions.filter((p) => p.status === 'closed'), (p) => p.exitAt ?? p.entryAt);

  return (
    <Box>
      <CashSummary balances={balances} />
      <PnLSummary open={open} closed={closed} />
      <Divider sx={{ mb: 1 }} />

      <Typography variant="overline" color="text.secondary">Open Positions</Typography>
      {open.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          No open positions.
        </Typography>
      ) : (
        open.map((p, i) => (
          <React.Fragment key={p.id}>
            {i > 0 && <Divider />}
            <PositionCard position={p} />
          </React.Fragment>
        ))
      )}

      {closed.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="overline" color="text.secondary">Trade History</Typography>
          {groupEntriesByDate(closed, (p) => p.exitAt ?? p.entryAt).map((group) => (
            <React.Fragment key={group.key}>
              <TimelineDateHeader label={group.label} />
              {group.items.map((p) => {
                const DirIcon = p.direction === 'long' ? LongIcon : ShortIcon;
                return (
                  <TimelineRow
                    key={p.id}
                    color={p.realizedPL == null ? '#9e9e9e' : p.realizedPL >= 0 ? '#4caf50' : '#f44336'}
                    icon={<DirIcon />}
                  >
                    <PositionCard position={p} leadingTime={p.exitAt ?? p.entryAt} />
                  </TimelineRow>
                );
              })}
            </React.Fragment>
          ))}
        </>
      )}
    </Box>
  );
};
