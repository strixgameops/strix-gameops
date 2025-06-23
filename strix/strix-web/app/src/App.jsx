import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { CssBaseline } from '@mui/material';

// Styles
import './css/App.css';
import 'highlight.js/styles/atom-one-light.min.css';
import 'react-date-range/dist/styles.css';
import './components/shared/dateRangePicker/rangePickerTheme.css';

// Core components and hooks
import ErrorBoundary from './components/shared/errorBoundary/ErrorBoundary';
import { AppLoading } from './components/shared/LoadingScreen';
import MobileDetector from './components/shared/MobileDetector';
import { useViewport } from './hooks/useViewport';
import { useTheme } from './contexts/ThemeContext';
import { useUser } from './contexts/UserContext';
import { usePageTracking } from './components/firebase/analytics';

// Themes
import darkTheme from './css/theme/darkTheme';
import lightTheme from './css/theme/lightTheme';

// Lazy load main components
const AuthenticatedApp = lazy(() => 
  import('./components/app/AuthenticatedApp').catch(error => {
    console.error('Failed to load AuthenticatedApp:', error);
    return { default: () => <div>Failed to load application</div> };
  })
);

const UnauthenticatedApp = lazy(() => 
  import('./components/app/UnauthenticatedApp').catch(error => {
    console.error('Failed to load UnauthenticatedApp:', error);
    return { default: () => <div>Failed to load authentication</div> };
  })
);

const DemoBadge = lazy(() => 
  import('./components/pages/demo/DemoBadge').catch(error => {
    console.error('Failed to load DemoBadge:', error);
    return { default: () => null };
  })
);

const App = () => {
  const { theme } = useTheme();
  const { authState, isAuthenticated, user } = useUser();
  const { isMobile, isTablet, width } = useViewport();

  // Initialize analytics page tracking
  usePageTracking();

  // Memoize theme selection to prevent unnecessary re-renders
  const selectedTheme = useMemo(() => 
    theme === 'light' ? lightTheme : darkTheme, 
    [theme]
  );

  // DnD backend options
  const dndOptions = useMemo(() => ({
    enableMouseEvents: true,
    delay: 100,
    delayTouchStart: 100,
  }), []);

  // Log app initialization
  useEffect(() => {
    console.log('App initialized:', {
      authState,
      isAuthenticated,
      theme,
      viewport: { isMobile, isTablet, width },
    });
  }, [authState, isAuthenticated, theme, isMobile, isTablet, width]);

  // Handle mobile devices
  if (isMobile) {
    return (
      <ErrorBoundary>
        <MuiThemeProvider theme={selectedTheme}>
          <CssBaseline />
          <MobileDetector isMobile={isMobile} isTablet={isTablet} />
        </MuiThemeProvider>
      </ErrorBoundary>
    );
  }

  // Show loading during auth initialization
  if (authState === 'loading') {
    return (
      <ErrorBoundary>
        <MuiThemeProvider theme={selectedTheme}>
          <CssBaseline />
          <AppLoading message="Initializing application..." />
        </MuiThemeProvider>
      </ErrorBoundary>
    );
  }

  // Handle auth errors
  if (authState === 'error') {
    return (
      <ErrorBoundary>
        <MuiThemeProvider theme={selectedTheme}>
          <CssBaseline />
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100vh',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2>Authentication Error</h2>
            <p>Please refresh the page or contact support if the problem persists.</p>
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </MuiThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <MuiThemeProvider theme={selectedTheme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DndProvider backend={TouchBackend} options={dndOptions}>
            <div className="App-Tower">
              <div className="App">
                <Suspense fallback={<AppLoading message="Loading application..." />}>
                  {isAuthenticated ? (
                    <AuthenticatedApp user={user} />
                  ) : (
                    <UnauthenticatedApp />
                  )}
                </Suspense>
              </div>
            </div>
          </DndProvider>
        </LocalizationProvider>
      </MuiThemeProvider>
    </ErrorBoundary>
  );
};

export default App;