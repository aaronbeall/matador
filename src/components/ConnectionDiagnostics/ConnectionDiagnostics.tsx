import React, { useState } from 'react';
import { Box, IconButton, Popover, Typography, Chip, Button, Tooltip, Divider } from '@mui/material';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon, Refresh as RefreshIcon, RestartAlt as RestartAltIcon } from '@mui/icons-material';
import { ExternalDataStatus } from '../../services/MarketDataClient';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface ConnectionDiagnosticsProps {
  connectionState: ConnectionState;
  externalDataStatus: ExternalDataStatus;
  symbol: string;
  onReconnectClient: () => void;
  onReconnectExternal: () => void;
  onRebuildCache: (symbol: string) => Promise<void>;
}

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  connected: 'success',
  connecting: 'warning',
  disconnected: 'error',
  error: 'error',
};

// Two independent connections make up "is live data actually flowing":
// browser <-> Node (this app's own WebSocket) and Node <-> Alpaca (the
// external data API, which only Node can see). Surfacing both — and a
// manual repair action for each — because "it says Live but nothing's
// moving" is otherwise undiagnosable from the UI alone.
export const ConnectionDiagnostics: React.FC<ConnectionDiagnosticsProps> = ({
  connectionState,
  externalDataStatus,
  symbol,
  onReconnectClient,
  onReconnectExternal,
  onRebuildCache,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const healthy = connectionState === 'connected' && externalDataStatus === 'connected';

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await onRebuildCache(symbol);
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <>
      <Tooltip title="Connection diagnostics">
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit" sx={{ mr: 1 }}>
          {healthy ? <WifiIcon /> : <WifiOffIcon sx={{ color: 'warning.main' }} />}
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width: 300, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle2">Connection diagnostics</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              <Typography variant="body2">App ↔ Server</Typography>
              <Typography variant="caption" color="text.secondary">
                This browser tab's connection to the local dev server
              </Typography>
            </Box>
            <Chip label={connectionState} size="small" color={statusColor[connectionState]} />
          </Box>
          <Button size="small" startIcon={<RefreshIcon />} onClick={onReconnectClient} variant="outlined">
            Reconnect
          </Button>

          <Divider />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              <Typography variant="body2">Server ↔ Market Data</Typography>
              <Typography variant="caption" color="text.secondary">
                The server's connection to the live data provider
              </Typography>
            </Box>
            <Chip label={externalDataStatus} size="small" color={statusColor[externalDataStatus]} />
          </Box>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onReconnectExternal}
            variant="outlined"
            disabled={connectionState !== 'connected'}
          >
            Reconnect
          </Button>
          {connectionState !== 'connected' && (
            <Typography variant="caption" color="text.secondary">
              Reconnect the app first — the server can't be reached to ask it to reconnect.
            </Typography>
          )}

          <Divider />

          <Box>
            <Typography variant="body2">Cached history — {symbol}</Typography>
            <Typography variant="caption" color="text.secondary">
              Deletes the cached candles/indicators for this symbol and re-fetches everything fresh from Alpaca
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={handleRebuild}
            variant="outlined"
            disabled={rebuilding || connectionState !== 'connected'}
          >
            {rebuilding ? 'Rebuilding…' : 'Rebuild cache'}
          </Button>
        </Box>
      </Popover>
    </>
  );
};
