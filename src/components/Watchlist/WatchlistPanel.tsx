import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  TextField,
  Typography,
  Switch,
  Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { WatchlistEntry } from '../../types/Watchlist';
import { SymbolBadge } from '../SymbolBadge';

interface WatchlistPanelProps {
  watchlist: WatchlistEntry[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onToggleActive: (symbol: string, active: boolean) => void;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  watchlist,
  activeSymbol,
  onSelectSymbol,
  onAdd,
  onRemove,
  onToggleActive,
}) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const symbol = input.trim().toUpperCase();
    if (symbol) {
      onAdd(symbol);
      setInput('');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Add symbol"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          fullWidth
        />
        <IconButton onClick={handleAdd} color="primary" size="small">
          <AddIcon />
        </IconButton>
      </Box>
      {watchlist.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No symbols yet — add one above.
        </Typography>
      ) : (
        <List dense disablePadding>
          {watchlist.map((entry) => (
            <ListItem
              key={entry.symbol}
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title={entry.active ? 'Active — pause caching and find-trades analysis' : 'Paused — click to reactivate'}>
                    <Switch
                      size="small"
                      checked={entry.active}
                      onChange={(e) => onToggleActive(entry.symbol, e.target.checked)}
                    />
                  </Tooltip>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onRemove(entry.symbol)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemButton
                selected={entry.symbol === activeSymbol}
                onClick={() => onSelectSymbol(entry.symbol)}
              >
                <ListItemText
                  primary={<SymbolBadge symbol={entry.symbol} />}
                  sx={{ opacity: entry.active ? 1 : 0.5 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
