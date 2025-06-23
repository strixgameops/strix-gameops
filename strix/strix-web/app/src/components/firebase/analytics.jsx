import { useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { analytics, isUsingFirebase } from "./firebase";
import { logEvent, isSupported } from "firebase/analytics";

// Analytics event types
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  SCREEN_VIEW: 'screen_view',
  USER_ENGAGEMENT: 'user_engagement',
  ERROR: 'exception',
  TIMING: 'timing_complete',
  CUSTOM: 'custom_event',
};

// Check if analytics is available and supported
const isAnalyticsAvailable = async () => {
  try {
    // Don't use analytics if Firebase is disabled
    if (!isUsingFirebase()) {
      return false;
    }
    
    if (!analytics) return false;
    return await isSupported();
  } catch (error) {
    console.warn('Analytics not supported:', error);
    return false;
  }
};

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Skip tracking if Firebase is not being used
    if (!isUsingFirebase()) {
      return;
    }

    const trackPage = async () => {
      const currentPath = location.pathname;
      const search = location.search;
      const fullPath = currentPath + search;

      try {
        await trackPageView(fullPath, {
          page_title: document.title,
          page_location: window.location.href,
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    // Small delay to ensure page has loaded
    const timeoutId = setTimeout(trackPage, 100);
    return () => clearTimeout(timeoutId);
  }, [location]);
};

const trackPageView = async (path, additionalParams = {}) => {
  const available = await isAnalyticsAvailable();
  
  if (!available) {
    if (isUsingFirebase()) {
      console.warn('Analytics not available - page view not tracked');
    }
    return;
  }

  try {
    logEvent(analytics, ANALYTICS_EVENTS.SCREEN_VIEW, {
      firebase_screen: path,
      firebase_screen_class: 'react',
      ...additionalParams,
    });

    // Also track as page_view for GA4
    logEvent(analytics, ANALYTICS_EVENTS.PAGE_VIEW, {
      page_path: path,
      ...additionalParams,
    });

    console.log('📊 Page tracked:', path);
  } catch (error) {
    console.error('Failed to log page view:', error);
  }
};

// Custom event tracking
export const trackEvent = async (eventName, parameters = {}) => {
  const available = await isAnalyticsAvailable();
  
  if (!available) {
    if (isUsingFirebase()) {
      console.warn(`Analytics not available - event "${eventName}" not tracked`);
    }
    return;
  }

  try {
    logEvent(analytics, eventName, parameters);
    console.log('📊 Event tracked:', eventName, parameters);
  } catch (error) {
    console.error(`Failed to track event "${eventName}":`, error);
  }
};

// User engagement tracking
export const trackUserEngagement = async (engagementType, parameters = {}) => {
  if (!isUsingFirebase()) return;
  
  await trackEvent(ANALYTICS_EVENTS.USER_ENGAGEMENT, {
    engagement_type: engagementType,
    ...parameters,
  });
};

// Error tracking
export const trackError = async (error, additionalContext = {}) => {
  if (!isUsingFirebase()) return;
  
  await trackEvent(ANALYTICS_EVENTS.ERROR, {
    description: error.message || 'Unknown error',
    fatal: false,
    error_type: error.name || 'Error',
    ...additionalContext,
  });
};

// Timing tracking
export const trackTiming = async (name, value, category = 'general') => {
  if (!isUsingFirebase()) return;
  
  await trackEvent(ANALYTICS_EVENTS.TIMING, {
    name,
    value,
    event_category: category,
  });
};

// Business-specific tracking functions
export const trackGameAction = async (action, gameId, additionalParams = {}) => {
  if (!isUsingFirebase()) return;
  
  await trackEvent('game_action', {
    action,
    game_id: gameId,
    ...additionalParams,
  });
};

export const trackStudioAction = async (action, studioId, additionalParams = {}) => {
  if (!isUsingFirebase()) return;
  
  await trackEvent('studio_action', {
    action,
    studio_id: studioId,
    ...additionalParams,
  });
};

export const trackAnalyticsView = async (viewType, filters = {}) => {
  if (!isUsingFirebase()) return;
  
  await trackEvent('analytics_view', {
    view_type: viewType,
    filters: JSON.stringify(filters),
  });
};

export const trackModalAction = async (modalType, action) => {
  if (!isUsingFirebase()) return;
  
  await trackEvent('modal_action', {
    modal_type: modalType,
    action,
  });
};

// Hook for tracking component lifecycle
export const useComponentTracking = (componentName) => {
  const trackComponentMount = useCallback(async () => {
    if (!isUsingFirebase()) return;
    
    await trackEvent('component_mount', {
      component_name: componentName,
    });
  }, [componentName]);

  const trackComponentUnmount = useCallback(async () => {
    if (!isUsingFirebase()) return;
    
    await trackEvent('component_unmount', {
      component_name: componentName,
    });
  }, [componentName]);

  useEffect(() => {
    if (!isUsingFirebase()) return;
    
    trackComponentMount();
    return () => {
      trackComponentUnmount();
    };
  }, [trackComponentMount, trackComponentUnmount]);

  return {
    trackComponentMount,
    trackComponentUnmount,
  };
};

// Hook for tracking user interactions
export const useInteractionTracking = () => {
  const trackClick = useCallback(async (elementType, elementId, additionalParams = {}) => {
    if (!isUsingFirebase()) return;
    
    await trackEvent('click', {
      element_type: elementType,
      element_id: elementId,
      ...additionalParams,
    });
  }, []);

  const trackFormSubmit = useCallback(async (formName, success = true) => {
    if (!isUsingFirebase()) return;
    
    await trackEvent('form_submit', {
      form_name: formName,
      success,
    });
  }, []);

  const trackSearch = useCallback(async (searchTerm, resultCount = 0) => {
    if (!isUsingFirebase()) return;
    
    await trackEvent('search', {
      search_term: searchTerm,
      result_count: resultCount,
    });
  }, []);

  return {
    trackClick,
    trackFormSubmit,
    trackSearch,
  };
};