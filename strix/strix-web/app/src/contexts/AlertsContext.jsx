import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  IconButton,
  Slide,
  Stack
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { sendBugReport } from '../api/index'; // Direct import to avoid circular dependencies

const AlertContext = createContext();

const ALERT_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

const DEFAULT_DURATION = {
  [ALERT_TYPES.SUCCESS]: 4000,
  [ALERT_TYPES.INFO]: 5000,
  [ALERT_TYPES.WARNING]: 6000,
  [ALERT_TYPES.ERROR]: 8000,
};

const SlideTransition = (props) => <Slide {...props} direction="up" />;

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const alertIdCounter = useRef(0);
  const hoverTimeouts = useRef(new Map());

  const generateAlertId = useCallback(() => {
    alertIdCounter.current += 1;
    return `alert-${alertIdCounter.current}`;
  }, []);

  const removeAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    // Clear any associated hover timeout
    const timeout = hoverTimeouts.current.get(alertId);
    if (timeout) {
      clearTimeout(timeout);
      hoverTimeouts.current.delete(alertId);
    }
  }, []);

  const triggerAlert = useCallback((
    message,
    severity = ALERT_TYPES.SUCCESS,
    withBugReport = false,
    errorDetails = null,
    options = {}
  ) => {
    const {
      duration = DEFAULT_DURATION[severity],
      persistent = false,
      action = null,
    } = options;

    const alert = {
      id: generateAlertId(),
      message,
      severity,
      withBugReport,
      errorDetails,
      duration: persistent ? null : duration,
      action,
      timestamp: Date.now(),
    };

    setAlerts(prev => [...prev, alert]);

    // Auto-remove non-persistent alerts
    if (!persistent && duration) {
      setTimeout(() => {
        removeAlert(alert.id);
      }, duration);
    }

    return alert.id;
  }, [generateAlertId, removeAlert]);

  const sendAlertBugReport = useCallback(async (alertId, errorDetails) => {
    try {
      await sendBugReport({
        error: errorDetails,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      triggerAlert(
        'Bug report sent successfully. Thank you for helping us improve!',
        ALERT_TYPES.SUCCESS,
        false,
        null,
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Failed to send bug report:', error);
      triggerAlert(
        'Failed to send bug report. Please try again later.',
        ALERT_TYPES.ERROR,
        false,
        null,
        { duration: 4000 }
      );
    } finally {
      removeAlert(alertId);
    }
  }, [triggerAlert, removeAlert]);

  const handleMouseEnter = useCallback((alertId) => {
    const timeout = hoverTimeouts.current.get(alertId);
    if (timeout) {
      clearTimeout(timeout);
      hoverTimeouts.current.delete(alertId);
    }
  }, []);

  const handleMouseLeave = useCallback((alertId, originalDuration) => {
    if (originalDuration) {
      const timeout = setTimeout(() => {
        removeAlert(alertId);
      }, 1000); // Give 1 second after mouse leave

      hoverTimeouts.current.set(alertId, timeout);
    }
  }, [removeAlert]);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    hoverTimeouts.current.forEach(timeout => clearTimeout(timeout));
    hoverTimeouts.current.clear();
  }, []);

  const value = {
    alerts,
    triggerAlert,
    removeAlert,
    clearAllAlerts,

    // Convenience methods
    showSuccess: (message, options) => triggerAlert(message, ALERT_TYPES.SUCCESS, false, null, options),
    showError: (message, withBugReport = true, errorDetails = null, options = {}) =>
      triggerAlert(message, ALERT_TYPES.ERROR, withBugReport, errorDetails, options),
    showWarning: (message, options) => triggerAlert(message, ALERT_TYPES.WARNING, false, null, options),
    showInfo: (message, options) => triggerAlert(message, ALERT_TYPES.INFO, false, null, options),
  };

  return (
    <AlertContext.Provider value={value}>
      {children}

      {/* Render all active alerts */}
      <Stack
        spacing={1}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          maxWidth: 400,
          width: '100%',
        }}
      >
        {alerts.map((alert) => (
          <Snackbar
            key={alert.id}
            open
            TransitionComponent={SlideTransition}
            onMouseEnter={() => handleMouseEnter(alert.id)}
            onMouseLeave={() => handleMouseLeave(alert.id, alert.duration)}
          >
            <Alert
              severity={alert.severity}
              variant="filled"
              onClose={() => removeAlert(alert.id)}
              sx={{ width: '100%' }}
              action={
                <Stack direction="row" spacing={1} alignItems="center">
                  {alert.withBugReport && (
                    <IconButton
                      size="small"
                      onClick={() => sendAlertBugReport(alert.id, alert.errorDetails)}
                      sx={{
                        color: 'inherit',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                      title="Report this issue"
                    >
                      <BugReportIcon fontSize="small" />
                    </IconButton>
                  )}

                  {alert.action}

                  <IconButton
                    size="small"
                    onClick={() => removeAlert(alert.id)}
                    sx={{
                      color: 'inherit',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              {alert.message}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }

  return context;
};
