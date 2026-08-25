import React from 'react';
import { Box, Typography, Chip, Divider, Stack } from '@mui/material';
import {
  TrendingUp as LongIcon,
  TrendingDown as ShortIcon,
  AccountBalanceWallet as CashIcon,
} from '@mui/icons-material';
import { Position, AccountBalance } from '../../types/Portfolio';
import { formatPrice, formatTimestamp, formatRelativeTime } from '../../utils/formatters';
import { SymbolBadge } from '../SymbolBadge';

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
        No account balance on file — tell Claude your current cash balance to start tracking it.
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

const PositionCard = ({ position }: { position: Position }) => {
  const DirIcon = position.direction === 'long' ? LongIcon : ShortIcon;
  const plColor = position.realizedPL == null ? 'text.secondary' : position.realizedPL >= 0 ? 'success.main' : 'error.main';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <DirIcon fontSize="small" color={position.direction === 'long' ? 'success' : 'error'} />
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
          {closed.map((p) => (
            <React.Fragment key={p.id}>
              <Divider />
              <PositionCard position={p} />
            </React.Fragment>
          ))}
        </>
      )}
    </Box>
  );
};
