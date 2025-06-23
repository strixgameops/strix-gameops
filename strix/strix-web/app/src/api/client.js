import axios from "axios";
import { getAuthInstance, isUsingFirebase } from "../components/firebase/firebase.jsx";
import { jwtDecode } from "jwt-decode";
import { localAuthService } from "../components/firebase/localAuthService.js";

const baseURL = `${window.__env.siteBaseUrl}`;

export const strixAPI = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let cachedToken = null;
let cacheTimeout = null;

const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

const getCachedToken = async () => {
  if (cachedToken && !isTokenExpired(cachedToken)) {
    return cachedToken;
  }

  const auth = getAuthInstance();
  
  if (isUsingFirebase()) {
    // Firebase auth flow
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true);
      cachedToken = idToken;
      localStorage.setItem("accessToken", idToken);

      if (cacheTimeout) clearTimeout(cacheTimeout);
      cacheTimeout = setTimeout(() => {
        cachedToken = null;
        localStorage.removeItem("accessToken");
      }, 5 * 60 * 1000);

      return idToken;
    } else {
      localStorage.removeItem("accessToken");
      return null;
    }
  } else {
    // Local auth flow
    const token = await localAuthService.getCurrentToken();
    if (token && !isTokenExpired(token)) {
      cachedToken = token;
      localStorage.setItem("accessToken", token);

      if (cacheTimeout) clearTimeout(cacheTimeout);
      cacheTimeout = setTimeout(() => {
        cachedToken = null;
        localStorage.removeItem("accessToken");
      }, 5 * 60 * 1000);

      return token;
    } else {
      localStorage.removeItem("accessToken");
      return null;
    }
  }
};

strixAPI.interceptors.request.use(
  async (config) => {
    const auth = getAuthInstance();
    
    if (config.baseURL.startsWith(baseURL)) {
      if (isUsingFirebase()) {
        // Firebase auth
        if (auth.currentUser) {
          const token = await getCachedToken();
          if (token) {
            config.headers.authtoken = token;
          }
        }
      } else {
        // Local auth
        const token = await getCachedToken();
        if (token) {
          config.headers.authtoken = token;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

strixAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log("401 error, attempting token refresh...");
      
      try {
        const auth = getAuthInstance();
        
        if (isUsingFirebase()) {
          // Firebase token refresh
          if (auth.currentUser) {
            cachedToken = null;
            const newToken = await getCachedToken();
            
            if (newToken) {
              originalRequest.headers.authtoken = newToken;
              return strixAPI.request(originalRequest);
            }
          }
        } else {
          // Local auth - check if we still have a valid token
          const token = await localAuthService.getCurrentToken();
          if (token && !isTokenExpired(token)) {
            cachedToken = token;
            originalRequest.headers.authtoken = token;
            return strixAPI.request(originalRequest);
          } else {
            // Token is expired or invalid, sign out
            await localAuthService.signOut();
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
      }
      
      // If refresh failed or no user, redirect to login
      console.error("Unauthorized! Redirecting to login...", error.response);
      
      if (isUsingFirebase()) {
        const auth = getAuthInstance();
        if (!auth.currentUser) {
          window.location.href = "/login";
        } else {
          window.location.href = "/overview";
        }
      } else {
        // Local auth - always redirect to login on 401
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);

export const apiRequest = async (endpoint, data = {}, config = {}) => {
  try {
    const response = await strixAPI.post(endpoint, JSON.stringify(data), config);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    throw error;
  }
};