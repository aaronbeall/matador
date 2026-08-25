import React from 'react';
import { Box, Typography, Chip, Tooltip, Divider } from '@mui/material';
import {
  ShowChart as MarketDataIcon,
  AccountBalance as BrokerageIcon,
  SmartToy as AgentConfiguredIcon,
} from '@mui/icons-material';
import { Connection, ConnectionKind, ConnectionStatus } from '../../types/Connection';

interface ConnectionsPanelProps {
  connections: Connection[];
}

const KIND_ICON: Record<ConnectionKind, React.ElementType> = {
  'market-data': MarketDataIcon,
  brokerage: BrokerageIcon,
};

const KIND_LABEL: Record<ConnectionKind, string> = {
  'market-data': 'Market Data',
  brokerage: 'Brokerage',
};

const STATUS_COLOR: Record<ConnectionStatus, 'success' | 'default' | 'error'> = {
  connected: 'success',
  manual: 'default',
  disconnected: 'error',
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  manual: 'Manual',
  disconnected: 'Disconnected',
};

const ConnectionCard = ({ connection }: { connection: Connection }) => {
  const Icon = KIND_ICON[connection.kind];
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: 1.5,
        mb: 1.5,
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon fontSize="small" color="action" />
        <Typography variant="body2" fontWeight={700}>{connection.label}</Typography>
        <Chip label={connection.provider} size="small" variant="outlined" />
        <Chip label={STATUS_LABEL[connection.status]} size="small" color={STATUS_COLOR[connection.status]} />
        <Box sx={{ flexGrow: 1 }} />
        {!connection.configurable && (
          <Tooltip title="Configured through the agent — just ask it what to change">
            <AgentConfiguredIcon fontSize="small" color="disabled" />
          </Tooltip>
        )}
      </Box>

      {connection.details && Object.keys(connection.details).length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.25,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'action.selected',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {Object.entries(connection.details).map(([key, value]) => (
            <Typography
              key={key}
              variant="caption"
              sx={{ fontFamily: 'ui-monospace, monospace', color: 'text.secondary' }}
            >
              {key}: {value}
            </Typography>
          ))}
        </Box>
      )}

      {connection.notes && (
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          {connection.notes}
        </Typography>
      )}
    </Box>
  );
};

// External systems the app reflects — market data and brokerage accounts
// today. Pulled out of Portfolio's old bottom-anchored "Connectors"
// overlay into its own top-level section: this is app-wide configuration,
// not account state, so it doesn't belong scoped inside Portfolio. None of
// these have a self-service settings form (`configurable: false`) — same
// as the rest of this app's data, they're configured conversationally:
// tell Claude what to change and it updates data/connections.json (or, for
// something code-level like swapping market-data providers, the actual
// integration) directly. That's the real, intended workflow here, not a
// placeholder for a form that doesn't exist yet.
export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({ connections }) => {
  const byKind = (kind: ConnectionKind) => connections.filter((c) => c.kind === kind);
  const kinds: ConnectionKind[] = ['market-data', 'brokerage'];

  if (connections.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No connections configured.
      </Typography>
    );
  }

  return (
    <Box>
      {kinds.map((kind) => {
        const items = byKind(kind);
        if (items.length === 0) return null;
        return (
          <Box key={kind} sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary">{KIND_LABEL[kind]}</Typography>
            <Divider sx={{ mb: 1 }} />
            {items.map((c) => (
              <ConnectionCard key={c.id} connection={c} />
            ))}
          </Box>
        );
      })}
    </Box>
  );
};
