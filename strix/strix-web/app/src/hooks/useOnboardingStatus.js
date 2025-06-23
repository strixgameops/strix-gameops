import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@strix/userContext';
import useApi from '@strix/api';

// Safe localStorage wrapper
const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null && value !== 'null' ? value : defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set ${key} in localStorage:`, error);
      return false;
    }
  }
};

/**
 * Hook to manage onboarding status across the application
 * This prevents tutorials and other features from showing during initial setup
 */
export const useOnboardingStatus = () => {
  const { userState, userProfile } = useUser();
  const { getPublishers } = useApi();
  
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const checkedRef = useRef(false);

  const checkOnboardingStatus = useCallback(async () => {
    if (!userState?.uid || checkedRef.current) return;
    
    checkedRef.current = true;
    setIsCheckingOnboarding(true);

    try {
      // First check if we have a cached onboarding completion status
      const cachedStatus = safeLocalStorage.get('onboarding_completed');
      if (cachedStatus === 'true') {
        setIsOnboarding(false);
        setIsCheckingOnboarding(false);
        return;
      }

      // Check if user has completed onboarding by verifying publishers exist
      const response = await getPublishers({ email: userState.uid });
      
      const hasCompletedOnboarding = response.success && 
                                   response.publishers && 
                                   response.publishers.length > 0;

      setIsOnboarding(!hasCompletedOnboarding);
      
      // Cache the completion status if onboarding is complete
      if (hasCompletedOnboarding) {
        safeLocalStorage.set('onboarding_completed', 'true');
      }
      
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, assume onboarding is needed to be safe
      setIsOnboarding(true);
    } finally {
      setIsCheckingOnboarding(false);
    }
  }, [userState?.uid, getPublishers]);

  const markOnboardingComplete = useCallback(() => {
    setIsOnboarding(false);
    safeLocalStorage.set('onboarding_completed', 'true');
  }, []);

  const resetOnboardingStatus = useCallback(() => {
    setIsOnboarding(true);
    safeLocalStorage.set('onboarding_completed', 'false');
    checkedRef.current = false;
  }, []);

  // Check onboarding status when user changes
  useEffect(() => {
    if (userState?.uid) {
      checkOnboardingStatus();
    } else {
      // Reset state when user logs out
      setIsOnboarding(true);
      setIsCheckingOnboarding(false);
      checkedRef.current = false;
    }
  }, [userState?.uid, checkOnboardingStatus]);

  return {
    isOnboarding,
    isCheckingOnboarding,
    markOnboardingComplete,
    resetOnboardingStatus,
    recheckOnboardingStatus: () => {
      checkedRef.current = false;
      checkOnboardingStatus();
    }
  };
};