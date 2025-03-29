import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Paper sx={{ p: 3, bgcolor: 'error.dark' }}>
          <Box>
            <Typography variant="h6" color="error.contrastText">
              Something went wrong
            </Typography>
            <Typography variant="body2" color="error.contrastText">
              {this.state.error?.message}
            </Typography>
          </Box>
        </Paper>
      );
    }

    return this.props.children;
  }
}
