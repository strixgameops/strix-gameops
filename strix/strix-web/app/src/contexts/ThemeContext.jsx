import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'app-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
    return null;
  }
};

const setStoredTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to store theme in localStorage:', error);
  }
};

const getSystemTheme = () => {
  return THEMES.LIGHT
  if (typeof window === 'undefined') return THEMES.LIGHT;
  
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? THEMES.DARK 
      : THEMES.LIGHT;
  } catch (error) {
    console.warn('Failed to detect system theme:', error);
    return THEMES.LIGHT;
  }
};

const getInitialTheme = () => {
  const storedTheme = getStoredTheme();
  
  if (storedTheme && Object.values(THEMES).includes(storedTheme)) {
    return storedTheme;
  }
  
  return getSystemTheme();
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [isSystemTheme, setIsSystemTheme] = useState(() => !getStoredTheme());

  // Apply theme to document and persist
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      
      if (!isSystemTheme) {
        setStoredTheme(theme);
      }
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  }, [theme, isSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      if (isSystemTheme) {
        setThemeState(e.matches ? THEMES.DARK : THEMES.LIGHT);
      }
    };

    try {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } catch (error) {
      console.warn('Failed to listen for system theme changes:', error);
      return () => {};
    }
  }, [isSystemTheme]);

  const setTheme = useCallback((newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }
    
    setThemeState(newTheme);
    setIsSystemTheme(false);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  }, [theme, setTheme]);

  const useSystemTheme = useCallback(() => {
    setIsSystemTheme(true);
    setThemeState(getSystemTheme());
    
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove theme from localStorage:', error);
    }
  }, []);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    useSystemTheme,
    isSystemTheme,
    availableThemes: THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// For backward compatibility
export const useThemeContext = useTheme;