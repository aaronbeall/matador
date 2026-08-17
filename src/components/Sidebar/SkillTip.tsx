import React from 'react';
import { Box, Typography } from '@mui/material';
import { TipsAndUpdates as TipIcon } from '@mui/icons-material';

interface SkillTipProps {
  children: React.ReactNode;
}

// A small "how does this data get updated" hint shown at the top of each
// analysis panel — this app's data is written by Claude (skills, or
// direct edits in a chat), not by the frontend itself, so it's easy to
// stare at an empty panel not knowing that.
export const SkillTip: React.FC<SkillTipProps> = ({ children }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 1,
      alignItems: 'flex-start',
      p: 1,
      mb: 1.5,
      borderRadius: 1,
      bgcolor: 'action.hover',
    }}
  >
    <TipIcon fontSize="small" sx={{ color: 'text.secondary', mt: '2px' }} />
    <Typography variant="caption" color="text.secondary">
      {children}
    </Typography>
  </Box>
);
