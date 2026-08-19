import React from 'react';
import { Box, ButtonBase, Badge, Typography } from '@mui/material';

export interface SidebarNavItem {
  value: string;
  label: string;
  icon: React.ReactElement;
  badgeCount?: number;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  // false when the panel is collapsed — no item reads as "selected" while
  // there's nothing open to select.
  value: string | false;
  onChange: (value: string) => void;
}

// Vertical icon rail for the analysis drawer, docked persistently on the
// panel's right edge (unlike the panel content itself, this never
// disappears — see App.tsx's sidebarOpen). Every click always calls
// onChange, even for the item that's already selected — App.tsx uses that
// to collapse the panel on a re-click (VSCode activity-bar style), a
// toggle behavior MUI's own Tabs component can't provide since Tabs only
// fires onChange when the value actually changes, silently swallowing a
// click on the already-active tab. Built from plain ButtonBase rather
// than Tabs/Tab for that reason — full, predictable control over every
// click instead of fighting Tabs' built-in value-change suppression.
export const SidebarNav: React.FC<SidebarNavProps> = ({ items, value, onChange }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', borderLeft: 1, borderColor: 'divider', width: 52, flexShrink: 0 }}>
    {items.map((item) => {
      const selected = item.value === value;
      return (
        <ButtonBase
          key={item.value}
          onClick={() => onChange(item.value)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.25,
            width: '100%',
            minHeight: 40,
            py: 0.5,
            color: selected ? 'primary.main' : 'text.secondary',
            borderLeft: 2,
            borderColor: selected ? 'primary.main' : 'transparent',
            bgcolor: selected ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Badge badgeContent={item.badgeCount ?? 0} color="error" overlap="circular" sx={{ '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}>
            {item.icon}
          </Badge>
          <Typography sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>{item.label}</Typography>
        </ButtonBase>
      );
    })}
  </Box>
);
