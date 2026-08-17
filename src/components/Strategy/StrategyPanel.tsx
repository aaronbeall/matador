import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface StrategyPanelProps {
  strategyText: string | null;
  loading: boolean;
  error: string | null;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategyText, loading, error }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ p: 2 }}>
        {error}
      </Typography>
    );
  }

  return (
    <Box
      component="pre"
      sx={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '0.8rem',
        lineHeight: 1.5,
        m: 0,
        p: 1,
      }}
    >
      {strategyText}
    </Box>
  );
};
