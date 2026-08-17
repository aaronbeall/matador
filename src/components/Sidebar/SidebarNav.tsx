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
  value: string;
  onChange: (value: string) => void;
}

// Vertical icon rail for the analysis drawer — replaces a horizontal
// scrolling Tabs strip, which stopped fitting once there were more than
// ~4 sections. Each item can carry a badge count for "new since you last
// looked" content.
export const SidebarNav: React.FC<SidebarNavProps> = ({ items, value, onChange }) => (
  <Tabs
    orientation="vertical"
    value={value}
    onChange={(_, newValue) => onChange(newValue)}
    sx={{
      borderRight: 1,
      borderColor: 'divider',
      minWidth: 88,
      '& .MuiTab-root': { minWidth: 88, minHeight: 64, py: 1.5 },
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
