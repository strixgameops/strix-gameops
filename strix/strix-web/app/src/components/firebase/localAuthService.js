import { jwtDecode } from "jwt-decode";

class LocalAuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.authStateChangeListeners = [];
    
    // Initialize from localStorage if available
    this.initializeFromStorage();
  }

  // Helper method to create user object with methods
  createUserObject(userData) {
    return {
      uid: userData.uid,
      email: userData.email,
      emailVerified: userData.emailVerified || true,
      isAnonymous: false,
      metadata: userData.metadata || {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      getIdToken: async (forceRefresh = false) => {
        if (forceRefresh || this.isTokenExpired()) {
          // In a real implementation, you might want to refresh the token here
          // For now, we'll return the current token
          console.warn("Token refresh not implemented for local auth");
        }
        return this.token;
      }
    };
  }

  initializeFromStorage() {
    const storedToken = localStorage.getItem("localAuthToken");
    const storedUser = localStorage.getItem("localAuthUser");
    
    if (storedToken && storedUser) {
      try {
        // Check if token is still valid
        const decoded = jwtDecode(storedToken);
        if (decoded.exp * 1000 > Date.now()) {
          this.token = storedToken;
          const userData = JSON.parse(storedUser);
          // Recreate user object with methods
          this.currentUser = this.createUserObject(userData);
          this.notifyAuthStateChange();
        } else {
          // Token expired, clear storage
          this.clearStorage();
        }
      } catch (error) {
        console.warn("Invalid stored token, clearing storage");
        this.clearStorage();
      }
    }
  }

  clearStorage() {
    localStorage.removeItem("localAuthToken");
    localStorage.removeItem("localAuthUser");
    this.currentUser = null;
    this.token = null;
  }

  // Firebase-compatible API
  async signInWithCustomToken(token) {
    try {
      const decoded = jwtDecode(token);
      
      // Create user data
      const userData = {
        uid: decoded.uid || decoded.email,
        email: decoded.email,
        emailVerified: true,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        }
      };

      // Create user object with methods
      this.currentUser = this.createUserObject(userData);
      this.token = token;
      
      // Store in localStorage (without methods)
      localStorage.setItem("localAuthToken", token);
      localStorage.setItem("localAuthUser", JSON.stringify({
        uid: userData.uid,
        email: userData.email,
        emailVerified: userData.emailVerified,
        metadata: userData.metadata
      }));

      this.notifyAuthStateChange();
      
      return { user: this.currentUser };
    } catch (error) {
      console.error("Local auth sign in error:", error);
      throw new Error("Invalid token");
    }
  }

  async signOut() {
    this.clearStorage();
    this.currentUser = null;
    this.token = null;
    this.notifyAuthStateChange();
  }

  isTokenExpired() {
    if (!this.token) return true;
    
    try {
      const decoded = jwtDecode(this.token);
      return decoded.exp * 1000 <= Date.now();
    } catch (error) {
      return true;
    }
  }

  // Auth state listener (Firebase-compatible)
  onAuthStateChanged(callback) {
    this.authStateChangeListeners.push(callback);
    
    // Immediately call with current state
    callback(this.currentUser);

    // Return unsubscribe function
    return () => {
      const index = this.authStateChangeListeners.indexOf(callback);
      if (index > -1) {
        this.authStateChangeListeners.splice(index, 1);
      }
    };
  }

  notifyAuthStateChange() {
    this.authStateChangeListeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        console.error("Auth state change listener error:", error);
      }
    });
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get current token
  async getCurrentToken() {
    if (this.isTokenExpired()) {
      return null;
    }
    return this.token;
  }
}

// Create singleton instance
export const localAuthService = new LocalAuthService();

// Firebase-compatible auth object
export const createLocalAuth = () => ({
  get currentUser() {
    return localAuthService.getCurrentUser();
  },
  
  signInWithCustomToken: (token) => localAuthService.signInWithCustomToken(token),
  
  signOut: () => localAuthService.signOut(),
  
  onAuthStateChanged: (callback) => localAuthService.onAuthStateChanged(callback)
});

export default localAuthService;