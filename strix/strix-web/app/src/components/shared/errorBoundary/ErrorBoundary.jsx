import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
}));

const ErrorPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: 600,
  width: '100%',
  textAlign: 'center',
}));

const ErrorCode = styled(Typography)(({ theme }) => ({
  fontFamily: 'monospace',
  backgroundColor: theme.palette.grey[100],
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.875rem',
  whiteSpace: 'pre-wrap',
  textAlign: 'left',
  maxHeight: 200,
  overflow: 'auto',
}));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    };

    // Log to console in development
    if (window.__env.environment === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Details:', errorDetails);
      console.groupEnd();
    }

    // Here you would typically send to your error monitoring service
    // Example: Sentry, LogRocket, etc.
    try {
      if (window.errorMonitoring) {
        window.errorMonitoring.captureError(errorDetails);
      }
    } catch (monitoringError) {
      console.error('Failed to log error to monitoring service:', monitoringError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Create bug report
    const bugReportUrl = `mailto:team@strixgameops.com?subject=Bug Report - Error ${errorId}&body=${encodeURIComponent(
      `Error ID: ${errorId}\n\nPlease describe what you were doing when this error occurred:\n\n\n--- Technical Details ---\n${JSON.stringify(errorDetails, null, 2)}`
    )}`;

    window.open(bugReportUrl);
  };

  getErrorSeverity = (error) => {
    if (!error) return 'medium';
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'low';
    }
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'medium';
    }
    
    return 'high';
  };

  getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  getErrorRecommendation = (error) => {
    if (!error) return 'Try refreshing the page or contact support if the problem persists.';
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'This appears to be a network issue. Please check your internet connection and try again.';
    }
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'This appears to be a loading issue. Refreshing the page should resolve this.';
    }
    
    return 'This is an unexpected error. Please try refreshing the page or contact support.';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      const severity = this.getErrorSeverity(error);
      const recommendation = this.getErrorRecommendation(error);

      return (
        <ErrorContainer>
          <ErrorPaper elevation={3}>
            <Stack spacing={3} alignItems="center">
              <ErrorIcon 
                sx={{ 
                  fontSize: 64, 
                  color: 'error.main',
                  opacity: 0.7,
                }} 
              />
              
              <Box>
                <Typography variant="h4" gutterBottom>
                  Oops! Something went wrong
                </Typography>
                
                <Typography variant="body1" color="text.secondary" paragraph>
                  We're sorry for the inconvenience. An unexpected error has occurred.
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`Severity: ${severity.toUpperCase()}`}
                    color={this.getSeverityColor(severity)}
                    size="small"
                  />
                  {errorId && (
                    <Chip 
                      label={`Error ID: ${errorId}`}
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {recommendation}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={this.handleRetry}
                  startIcon={<RefreshIcon />}
                >
                  Try Again
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={this.handleRefresh}
                >
                  Refresh Page
                </Button>
                
                <Button
                  variant="text"
                  onClick={this.handleReportBug}
                  startIcon={<BugReportIcon />}
                  size="small"
                >
                  Report Bug
                </Button>
              </Stack>

              {window.__env.environment === 'development' && (error || errorInfo) && (
                <Accordion sx={{ width: '100%', mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Development Error Details
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {error && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Error Message:
                          </Typography>
                          <ErrorCode>{error.message}</ErrorCode>
                        </Box>
                      )}
                      
                      {error?.stack && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Stack Trace:
                          </Typography>
                          <ErrorCode>{error.stack}</ErrorCode>
                        </Box>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Component Stack:
                          </Typography>
                          <ErrorCode>{errorInfo.componentStack}</ErrorCode>
                        </Box>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          </ErrorPaper>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;