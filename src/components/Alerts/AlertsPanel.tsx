import React, { useState } from 'react';
import { Box, List, ListItem, ListItemText, Typography, Chip, IconButton, Tooltip, Collapse } from '@mui/material';
import { Check as CheckIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { Alert, AlertCondition, AlertSeverity, AlertStatus } from '../../types/Alert';

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

const severityColor: Record<AlertSeverity, 'warning' | 'error'> = {
  watch: 'warning',
  action: 'error',
};

const statusColor: Record<AlertStatus, 'default' | 'success'> = {
  pending: 'default',
  triggered: 'success',
  superseded: 'default',
  expired: 'default',
};

const statusLabel: Record<AlertStatus, string> = {
  pending: 'watching',
  triggered: 'triggered',
  superseded: 'superseded',
  expired: 'expired',
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

const formatAge = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Whichever timestamp is more relevant right now — a just-triggered
  // alert should jump to the top even if it sat pending for a while.
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.triggeredAt ?? b.createdAt).getTime() - new Date(a.triggeredAt ?? a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No alerts yet.
      </Typography>
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

  return (
    <List dense disablePadding>
      {sorted.map((alert) => {
        const dimmed = alert.acknowledged || alert.status === 'superseded' || alert.status === 'expired';
        const isExpanded = expanded.has(alert.id);
        return (
          <ListItem
            key={alert.id}
            sx={{ opacity: dimmed ? 0.5 : 1, alignItems: 'flex-start', flexDirection: 'column' }}
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
              sx={{ pr: 4 }}
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={alert.severity} size="small" color={severityColor[alert.severity]} />
                  <Chip label={statusLabel[alert.status]} size="small" color={statusColor[alert.status]} variant="outlined" />
                  <Typography variant="body2" fontWeight="bold">
                    {alert.symbol}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatAge(alert.triggeredAt ?? alert.createdAt)}
                  </Typography>
                </Box>
              }
              secondary={
                <>
                  <Typography variant="body2" component="span" display="block" sx={{ mt: 0.5 }}>
                    {alert.headline}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="span" display="block">
                    {alert.rationale}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="span" display="block" fontStyle="italic">
                    {alert.actionGuidance}
                  </Typography>
                  {alert.status === 'pending' && alert.activeFrom && new Date(alert.activeFrom).getTime() > Date.now() && (
                    <Typography variant="caption" color="text.secondary" component="span" display="block">
                      starts watching at{' '}
                      {new Date(alert.activeFrom).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Typography>
                  )}
                </>
              }
            />
            <Box
              onClick={() => toggleExpanded(alert.id)}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mt: 0.5 }}
            >
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              <Typography variant="caption" color="text.secondary">
                technical conditions
              </Typography>
            </Box>
            <Collapse in={isExpanded} sx={{ width: '100%' }}>
              <Typography
                variant="caption"
                component="pre"
                sx={{ fontFamily: 'monospace', color: 'text.secondary', m: 0, whiteSpace: 'pre-wrap' }}
              >
                {formatCondition(alert.condition)}
              </Typography>
            </Collapse>
          </ListItem>
        );
      })}
    </List>
  );
};
