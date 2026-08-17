import React from 'react';
import { Box, List, ListItem, ListItemText, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { Alert, AlertSeverity } from '../../types/Alert';

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

const severityColor: Record<AlertSeverity, 'info' | 'warning' | 'error'> = {
  info: 'info',
  watch: 'warning',
  action: 'error',
};

const formatAge = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge }) => {
  const sorted = [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No alerts yet.
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {sorted.map((alert) => (
        <ListItem
          key={alert.id}
          sx={{ opacity: alert.acknowledged ? 0.5 : 1, alignItems: 'flex-start' }}
          secondaryAction={
            !alert.acknowledged && (
              <Tooltip title="Acknowledge">
                <IconButton edge="end" size="small" onClick={() => onAcknowledge(alert.id)}>
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )
          }
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={alert.severity} size="small" color={severityColor[alert.severity]} />
                <Typography variant="body2" fontWeight="bold">
                  {alert.symbol}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatAge(alert.createdAt)}
                </Typography>
              </Box>
            }
            secondary={alert.message}
          />
        </ListItem>
      ))}
    </List>
  );
};
