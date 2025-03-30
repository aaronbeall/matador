import { PropsWithChildren } from "react"
import { useTheme } from '../theme/ThemeContext';
import { Box, Typography } from "@mui/material";

export const TooltipContainer = ({ children }: PropsWithChildren) => {
  const { isDarkMode } = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        fontSize: '0.75rem',
        boxShadow: theme => `0 4px 20px ${isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)'}`,
        backdropFilter: 'blur(8px)',
        transform: 'translateY(-4px)',
        transition: 'all 0.2s ease-out',
      }}
    >
      {children}
    </Box>
  )
}

export const TooltipTimestamp = ({ time: label }: { time: number }) => (
  <Typography variant="caption" display="block" color="text.secondary">
    {new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </Typography>
)
export const TooltipGrid = ({ children }: PropsWithChildren) => (
  <Box sx={{ 
    display: 'grid', 
    gridTemplateColumns: 'auto auto',
    gap: 0.5,
    mt: 0.5,
    color: 'text.primary',
  }}>
    {children}
  </Box>
)

export const TooltipDivider = () => (
  <Box sx={{ 
    my: 1, 
    height: '1px', 
    bgcolor: 'divider',
    mx: -1.5,
  }} />
);