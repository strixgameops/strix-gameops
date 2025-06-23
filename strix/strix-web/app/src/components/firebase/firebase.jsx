import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { createLocalAuth, localAuthService } from "./localAuthService.js";

// Check if we should use Firebase
const useFirebase = window.__env?.useFirebase === true;

// Validate required environment variables for Firebase
const validateFirebaseConfig = () => {
  const requiredFields = [
    'fbApiKey',
    'fbAuthDomain', 
    'fbProjectId',
    'fbStorageBucket',
    'fbMessagingSenderId',
    'fbAppId'
  ];

  const missing = requiredFields.filter(field => !window.__env?.[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing Firebase environment variables: ${missing.join(', ')}`);
  }
};

// Create Firebase configuration object
const createFirebaseConfig = () => {
  if (!useFirebase) {
    return null;
  }

  try {
    validateFirebaseConfig();
    
    return {
      apiKey: window.__env.fbApiKey,
      authDomain: window.__env.fbAuthDomain,
      projectId: window.__env.fbProjectId,
      storageBucket: window.__env.fbStorageBucket,
      messagingSenderId: window.__env.fbMessagingSenderId,
      appId: window.__env.fbAppId,
      measurementId: window.__env.fbMeasurementId, // Optional
    };
  } catch (error) {
    console.error('Firebase configuration error:', error);
    
    // Fallback configuration for development
    if (window.__env.environment === 'development') {
      console.warn('Using fallback Firebase configuration for development');
      return {
        apiKey: "demo-api-key",
        authDomain: "demo-project.firebaseapp.com",
        projectId: "demo-project",
        storageBucket: "demo-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abc123",
      };
    }
    
    throw error;
  }
};

// Initialize Firebase or Local Auth
let app = null;
let analytics = null;
let auth = null;
let firebaseConfig = null;

if (useFirebase) {
  try {
    firebaseConfig = createFirebaseConfig();
    
    // Initialize Firebase App
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');

    // Initialize Auth
    auth = getAuth(app);

    // Initialize Analytics (only in production and if supported)
    if (window.__env.environment === 'production') {
      isSupported().then(supported => {
        if (supported) {
          analytics = getAnalytics(app);
          console.log('📊 Firebase Analytics initialized');
        } else {
          console.warn('📊 Firebase Analytics not supported in this environment');
        }
      }).catch(error => {
        console.warn('📊 Firebase Analytics initialization failed:', error);
      });
    } else {
      console.log('📊 Firebase Analytics disabled in development');
    }

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    
    // In development, we might want to continue without Firebase
    if (window.__env.environment === 'development') {
      console.warn('⚠️ Continuing without Firebase in development mode');
    } else {
      // In production, this is a critical error
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }
} else {
  // Initialize local auth
  console.log('🔑 Using local authentication (Firebase disabled)');
  auth = createLocalAuth();
  console.log('✅ Local auth initialized');
}

// Export configuration and instances
export { app, analytics, firebaseConfig };

// Always export auth, whether Firebase or local
export { auth };

// Helper function to get auth instance (avoid naming conflict with Firebase getAuth)
export const getAuthInstance = () => auth;

// Helper function to sign in with custom token (works with both Firebase and local)
export const signInWithCustomToken = async (authInstance, token) => {
  if (useFirebase) {
    // Use Firebase auth
    const { signInWithCustomToken: firebaseSignIn } = await import("firebase/auth");
    return await firebaseSignIn(authInstance, token);
  } else {
    // Use local auth
    return await authInstance.signInWithCustomToken(token);
  }
};

// Utility functions
export const isFirebaseAvailable = () => useFirebase && !!app;
export const isAnalyticsAvailable = () => useFirebase && !!analytics;
export const isAuthAvailable = () => !!auth;
export const isUsingFirebase = () => useFirebase;

// Development helpers
if (window.__env?.environment === 'development') {
  window.__firebase = {
    app,
    analytics,
    auth,
    config: firebaseConfig,
    isAvailable: isFirebaseAvailable(),
    isAnalyticsAvailable: isAnalyticsAvailable(),
    isAuthAvailable: isAuthAvailable(),
    isUsingFirebase: isUsingFirebase(),
    localAuthService: useFirebase ? null : localAuthService,
  };
}