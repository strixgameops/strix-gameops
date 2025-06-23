import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Stack, 
  Card, 
  CardContent,
  useTheme
} from '@mui/material';
import { 
  DesktopWindows, 
  TabletMac, 
  PhoneIphone,
  OpenInNew 
} from '@mui/icons-material';

const MobileDetector = ({ 
  isMobile, 
  isTablet, 
  minWidth = 1024,
  showTabletWarning = true 
}) => {
  const theme = useTheme();

  if (!isMobile && !(isTablet && showTabletWarning)) {
    return null;
  }

  const handleForceDesktop = () => {
    // Set viewport meta tag to force desktop view
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.content = 'width=1024';
    }
    window.location.reload();
  };

  const getIcon = () => {
    if (isMobile) return <PhoneIphone sx={{ fontSize: 48, color: 'primary.main' }} />;
    if (isTablet) return <TabletMac sx={{ fontSize: 48, color: 'warning.main' }} />;
    return <DesktopWindows sx={{ fontSize: 48, color: 'success.main' }} />;
  };

  const getTitle = () => {
    if (isMobile) return 'Mobile Device Detected';
    if (isTablet) return 'Tablet View Warning';
    return 'Screen Size Notice';
  };

  const getMessage = () => {
    if (isMobile) {
      return 'This application is optimized for desktop use and may not function properly on mobile devices.';
    }
    if (isTablet) {
      return 'Some features may be limited on tablet devices. For the best experience, please use a desktop computer.';
    }
    return `This application requires a minimum screen width of ${minWidth}px for optimal performance.`;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 500, 
          width: '100%',
          textAlign: 'center'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            {getIcon()}
            
            <Typography variant="h5" component="h1" fontWeight="bold">
              {getTitle()}
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              {getMessage()}
            </Typography>
            
            <Stack spacing={2} width="100%">
              {isMobile && (
                <Button
                  variant="contained"
                  onClick={handleForceDesktop}
                  startIcon={<DesktopWindows />}
                  fullWidth
                >
                  Force Desktop View
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                fullWidth
              >
                Refresh Page
              </Button>
              
              <Button
                variant="text"
                href="mailto:team@strixgameops.com"
                startIcon={<OpenInNew />}
                size="small"
              >
                Contact Support
              </Button>
            </Stack>
            
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Recommended minimum resolution: {minWidth}px × 768px
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MobileDetector;