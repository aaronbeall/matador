import React from 'react';
import { Tabs, Tab, Badge } from '@mui/material';

export interface SidebarNavItem {
  value: string;
  label: string;
  icon: React.ReactElement;
  badgeCount?: number;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  // false when the panel is collapsed — no tab reads as "selected" while
  // there's nothing open to select.
  value: string | false;
  onChange: (value: string) => void;
}

// Vertical icon rail for the analysis drawer, docked on the panel's right
// edge — replaces a horizontal scrolling Tabs strip, which stopped fitting
// once there were more than ~4 sections. Each item can carry a badge count
// for "new since you last looked" content. Deliberately compact (small
// icons, tiny labels) since this is a permanent fixture next to the
// content, not something that needs to read comfortably from a distance.
export const SidebarNav: React.FC<SidebarNavProps> = ({ items, value, onChange }) => (
  <Tabs
    orientation="vertical"
    value={value}
    onChange={(_, newValue) => onChange(newValue)}
    sx={{
      borderLeft: 1,
      borderColor: 'divider',
      minWidth: 52,
      '& .MuiTab-root': {
        minWidth: 52,
        minHeight: 40,
        py: 0.5,
        px: 0.5,
        fontSize: '0.6rem',
        lineHeight: 1.1,
        gap: 0.25,
      },
      '& .MuiTab-iconWrapper': {
        fontSize: '1.1rem',
      },
    }}
  >
    {items.map((item) => (
      <Tab
        key={item.value}
        value={item.value}
        label={item.label}
        icon={
          <Badge badgeContent={item.badgeCount ?? 0} color="error" overlap="circular">
            {item.icon}
          </Badge>
        }
      />
    ))}
  </Tabs>
);
