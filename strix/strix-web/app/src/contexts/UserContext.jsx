import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { jwtDecode } from "jwt-decode";
import { getAuthInstance, isUsingFirebase } from "../components/firebase/firebase";
import useApi from "../hooks/useApi";

const UserContext = createContext();

const TOKEN_STORAGE_KEY = "accessToken";
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

const AUTH_STATES = {
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  UNAUTHENTICATED: "unauthenticated",
  ERROR: "error",
  NETWORK_ERROR: "network_error",
};

const isTokenExpired = (token, thresholdMs = 0) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now() + thresholdMs;
  } catch {
    return true;
  }
};

const getStoredToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return token && !isTokenExpired(token) ? token : null;
  } catch {
    return null;
  }
};

const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Failed to store token:", error);
  }
};

const isNetworkError = (error) => {
  return (
    error?.code === "auth/network-request-failed" ||
    error?.message?.includes("network") ||
    error?.message?.includes("fetch") ||
    !navigator.onLine
  );
};

export const UserProvider = ({ children }) => {
  const { getUser } = useApi();
  const auth = getAuthInstance();

  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentToken, setCurrentToken] = useState(getStoredToken);

  const isMountedRef = useRef(true);
  const tokenRefreshTimeout = useRef(null);
  const retryAttempts = useRef(0);
  const isRefreshing = useRef(false);
  const authStateInitialized = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (tokenRefreshTimeout.current) {
        clearTimeout(tokenRefreshTimeout.current);
      }
    };
  }, []);

  const scheduleTokenRefresh = useCallback((token) => {
    if (!isMountedRef.current || !isUsingFirebase()) return; // Only schedule for Firebase

    if (tokenRefreshTimeout.current) {
      clearTimeout(tokenRefreshTimeout.current);
    }

    try {
      const decoded = jwtDecode(token);
      const delay = Math.max(
        0,
        decoded.exp * 1000 - TOKEN_REFRESH_THRESHOLD - Date.now()
      );

      tokenRefreshTimeout.current = setTimeout(async () => {
        if (
          isMountedRef.current &&
          auth?.currentUser &&
          !isRefreshing.current
        ) {
          try {
            await getAccessToken(true);
          } catch (error) {
            console.error("Scheduled token refresh failed:", error);
          }
        }
      }, delay);
    } catch (error) {
      console.error("Failed to schedule token refresh:", error);
    }
  }, []);

  const getAccessToken = useCallback(
    async (forceRefresh = false) => {
      if (!isMountedRef.current) return null;

      if (isRefreshing.current && !forceRefresh) {
        return currentToken;
      }

      if (!auth?.currentUser) {
        setCurrentToken(null);
        setStoredToken(null);
        return null;
      }

      if (
        !forceRefresh &&
        currentToken &&
        !isTokenExpired(currentToken, TOKEN_REFRESH_THRESHOLD)
      ) {
        return currentToken;
      }

      isRefreshing.current = true;

      try {
        let idToken;

        if (isUsingFirebase()) {
          // Firebase token refresh
          idToken = await auth.currentUser.getIdToken(forceRefresh);
        } else {
          // Local auth - get token from local auth service
          idToken = await auth.currentUser.getIdToken();
        }

        if (isMountedRef.current) {
          setCurrentToken(idToken);
          setStoredToken(idToken);
          if (isUsingFirebase()) {
            scheduleTokenRefresh(idToken);
          }
          retryAttempts.current = 0;
        }

        return idToken;
      } catch (error) {
        console.error("Failed to get access token:", error);

        if (isMountedRef.current) {
          if (
            isNetworkError(error) &&
            retryAttempts.current < MAX_RETRY_ATTEMPTS
          ) {
            retryAttempts.current++;
            const delay = RETRY_DELAY * Math.pow(2, retryAttempts.current - 1);

            setTimeout(() => {
              if (isMountedRef.current && auth?.currentUser) {
                getAccessToken(true).catch(console.error);
              }
            }, delay);
          } else {
            setCurrentToken(null);
            setStoredToken(null);
          }
        }

        throw error;
      } finally {
        isRefreshing.current = false;
      }
    },
    [currentToken, scheduleTokenRefresh, auth]
  );

  const fetchUserProfile = useCallback(
    async (userId) => {
      if (!isMountedRef.current) return;

      try {
        const response = await getUser(
          { showErrorAlert: false },
          { email: userId }
        );

        if (isMountedRef.current) {
          if (response.success) {
            setUserProfile(response.user);
            setAuthState(AUTH_STATES.AUTHENTICATED);
          } else {
            console.error("Failed to fetch user profile:", response.error);
            if (isNetworkError(response.error)) {
              setAuthState(AUTH_STATES.NETWORK_ERROR);
            } else {
              setAuthState(AUTH_STATES.ERROR);
              await auth?.signOut();
            }
          }
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Error fetching user profile:", error);

          if (isNetworkError(error)) {
            setAuthState(AUTH_STATES.NETWORK_ERROR);
          } else {
            setAuthState(AUTH_STATES.ERROR);
          }
        }
      }
    },
    [getUser, auth]
  );

  const handleAuthStateChange = useCallback(
    async (currentUser) => {
      if (!isMountedRef.current) return;

      try {
        if (!currentUser) {
          setUser(null);
          setUserProfile(null);
          setCurrentToken(null);
          setStoredToken(null);
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
          retryAttempts.current = 0;

          if (tokenRefreshTimeout.current) {
            clearTimeout(tokenRefreshTimeout.current);
          }
          return;
        }

        setUser(currentUser);
        authStateInitialized.current = true;

        try {
          const token = await getAccessToken(true);
          if (token && isMountedRef.current) {
            // For both Firebase and local auth, use email as the user identifier
            const userId = currentUser.email || currentUser.uid;
            await fetchUserProfile(userId);
          }
        } catch (error) {
          if (isMountedRef.current) {
            if (isNetworkError(error)) {
              console.warn("Network error during auth state change");
              setAuthState(AUTH_STATES.NETWORK_ERROR);
            } else {
              setAuthState(AUTH_STATES.ERROR);
            }
          }
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Auth state change error:", error);
          if (isNetworkError(error)) {
            setAuthState(AUTH_STATES.NETWORK_ERROR);
          } else {
            setAuthState(AUTH_STATES.ERROR);
          }
        }
      }
    },
    [getAccessToken, fetchUserProfile]
  );

  // Firebase auth listener - stable, no dependencies to prevent recreation
  useEffect(() => {
    if (!auth) {
      console.error("Auth not available");
      setAuthState(AUTH_STATES.ERROR);
      return;
    }

    console.log(
      `Setting up ${isUsingFirebase() ? "Firebase" : "local"} auth listener`
    );
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChange);

    return () => {
      console.log("Cleaning up auth listener");
      unsubscribe();
    };
  }, []);

  const updateUserProfile = useCallback((newProfile) => {
    if (isMountedRef.current) {
      setUserProfile((prev) => ({ ...prev, ...newProfile }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (
      user?.uid &&
      authState !== AUTH_STATES.NETWORK_ERROR &&
      isMountedRef.current
    ) {
      await fetchUserProfile(user.uid);
    }
  }, [user, fetchUserProfile, authState]);

  const signOut = useCallback(async () => {
    try {
      retryAttempts.current = 0;
      if (tokenRefreshTimeout.current) {
        clearTimeout(tokenRefreshTimeout.current);
      }
      await auth?.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [auth]); // Added auth as dependency

  const retryConnection = useCallback(async () => {
    if (
      authState === AUTH_STATES.NETWORK_ERROR &&
      user &&
      isMountedRef.current
    ) {
      retryAttempts.current = 0;
      setAuthState(AUTH_STATES.LOADING);

      try {
        const token = await getAccessToken(true);
        if (token && isMountedRef.current) {
          await fetchUserProfile(user.uid);
        }
      } catch (error) {
        console.error("Retry connection failed:", error);
        if (isMountedRef.current) {
          setAuthState(AUTH_STATES.NETWORK_ERROR);
        }
      }
    }
  }, [authState, user, getAccessToken, fetchUserProfile]);

  const value = {
    // State
    user,
    userProfile,
    authState,
    currentToken,

    // Computed values
    isAuthenticated: authState === AUTH_STATES.AUTHENTICATED,
    isLoading: authState === AUTH_STATES.LOADING,
    isError: authState === AUTH_STATES.ERROR,
    isNetworkError: authState === AUTH_STATES.NETWORK_ERROR,

    // Actions
    getAccessToken,
    updateUserProfile,
    refreshProfile,
    signOut,
    retryConnection,

    // Backward compatibility
    userState: user,
    authDone: authStateInitialized.current && authState !== AUTH_STATES.LOADING,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};