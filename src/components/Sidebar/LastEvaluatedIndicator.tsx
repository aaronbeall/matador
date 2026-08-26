import React from 'react';
import { Box, Typography } from '@mui/material';
import { AccessTime as ClockIcon } from '@mui/icons-material';
import { formatRelativeTime } from '../../utils/formatters';

// Sits right under each analysis panel's SkillTip — tells you *whether the
// agent has looked at this panel at all*, independent of whether that look
// changed anything. A quiet pullback day where nothing new qualifies still
// counts as evaluated; without this, that state is indistinguishable from
// "hasn't been checked since last week." No entry yet (iso undefined) means
// genuinely never evaluated — render nothing rather than a misleading
// placeholder.
export const LastEvaluatedIndicator: React.FC<{ iso?: string }> = ({ iso }) => {
  if (!iso) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 1, px: 0.25 }}>
      <ClockIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
      <Typography variant="caption" color="text.disabled">
        Agent last checked this {formatRelativeTime(iso)}
      </Typography>
    </Box>
  );
};
