import React, { useState, useEffect } from 'react';
import { 
  CircularProgress, 
  Typography, 
  Box, 
  LinearProgress,
  Fade,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  backgroundColor: theme.palette.background.default,
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 9999,
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  minHeight: 100,
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  width: 300,
  marginTop: theme.spacing(2),
}));

const LoadingScreen = ({ 
  message = 'Loading...', 
  submessage,
  progress,
  showProgress = false,
  variant = 'circular', // 'circular', 'linear', or 'dots'
  logo,
  timeout = 30000, // 30 seconds timeout
  onTimeout,
}) => {
  const [currentMessage, setCurrentMessage] = useState(message);
  const [dots, setDots] = useState('');
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Animate dots for loading effect
  useEffect(() => {
    if (variant === 'dots') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);

      return () => clearInterval(interval);
    }
  }, [variant]);

  // Handle timeout
  useEffect(() => {
    if (timeout > 0) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [timeout]);

  // Update message
  useEffect(() => {
    setCurrentMessage(message);
  }, [message]);

  const renderLoader = () => {
    if (hasTimedOut) {
      return (
        <Box textAlign="center">
          <Typography variant="h6" color="error" gutterBottom>
            Loading is taking longer than expected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please check your connection and try refreshing the page
          </Typography>
        </Box>
      );
    }

    switch (variant) {
      case 'linear':
        return (
          <ProgressContainer>
            <LinearProgress 
              variant={showProgress && progress !== undefined ? 'determinate' : 'indeterminate'}
              value={progress}
            />
          </ProgressContainer>
        );
      
      case 'dots':
        return (
          <Typography variant="h4" color="primary">
            {currentMessage}{dots}
          </Typography>
        );
      
      default:
        return (
          <CircularProgress 
            size={60} 
            thickness={4}
            variant={showProgress && progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
          />
        );
    }
  };

  return (
    <Fade in timeout={300}>
      <LoadingContainer>
        {logo && (
          <LogoContainer>
            {typeof logo === 'string' ? (
              <img src={logo} alt="Logo" style={{ maxHeight: 60 }} />
            ) : (
              logo
            )}
          </LogoContainer>
        )}

        <MessageContainer>
          {variant !== 'dots' && (
            <Typography 
              variant="h6" 
              color="text.primary" 
              textAlign="center"
              sx={{ minHeight: 32 }}
            >
              {currentMessage}
            </Typography>
          )}

          {submessage && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              textAlign="center"
            >
              {submessage}
            </Typography>
          )}

          {renderLoader()}

          {showProgress && progress !== undefined && variant !== 'linear' && (
            <Typography variant="caption" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          )}
        </MessageContainer>
      </LoadingContainer>
    </Fade>
  );
};

// Preset loading components for common use cases
export const AppLoading = ({ message = 'Loading application...' }) => (
  <LoadingScreen 
    message={message}
    variant="circular"
    timeout={30000}
  />
);

export const DataLoading = ({ message = 'Loading data...' }) => (
  <LoadingScreen 
    message={message}
    variant="linear"
    timeout={15000}
  />
);

export const AuthLoading = ({ message = 'Authenticating...' }) => (
  <LoadingScreen 
    message={message}
    variant="dots"
    timeout={10000}
  />
);

export const PageLoading = ({ message = 'Loading page...' }) => (
  <LoadingScreen 
    message={message}
    variant="circular"
    timeout={20000}
  />
);

export default LoadingScreen;