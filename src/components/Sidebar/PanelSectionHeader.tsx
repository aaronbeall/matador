import React from 'react';
import { Typography, SxProps, Theme } from '@mui/material';

// A real section divider — bold with a rule underneath, not a faint
// overline caption — used to separate "current symbol" from "other
// watchlist symbols" within a panel. Only worth showing at all once
// there's more than one symbol to actually separate; callers should skip
// rendering this (and the section it introduces) entirely when there's
// only one symbol on the watchlist, rather than labeling a section that
// has nothing to distinguish itself from.
export const PanelSectionHeader: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme> }> = ({
  children,
  sx,
}) => (
  <Typography
    variant="subtitle2"
    fontWeight={700}
    sx={{ pb: 0.5, mb: 0.5, borderBottom: '1px solid', borderColor: 'divider', ...sx }}
  >
    {children}
  </Typography>
);
