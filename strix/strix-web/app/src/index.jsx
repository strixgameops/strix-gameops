import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Global styles
import "./css/bootstrap/bootstrap.min.css";
import "./css/normalize.css";

// Main app component
import App from "./App";

// Context providers
import { ThemeProvider } from "./contexts/ThemeContext";
import { AlertProvider } from "./contexts/AlertsContext";
import { UserProvider } from "./contexts/UserContext";
import { GameProvider } from "./contexts/GameContext";
import ErrorBoundary from "./components/shared/errorBoundary/ErrorBoundary";

// Global error handler
const handleGlobalError = (error, errorInfo) => {
  console.error("Global error caught:", error, errorInfo);

  // Send to error tracking service
  // Example: Sentry.captureException(error, { extra: errorInfo });
};

// Provider composition for better organization
const AppProviders = ({ children }) => (
  <StrictMode>
    <ErrorBoundary onError={handleGlobalError}>
      <BrowserRouter>
        <ThemeProvider>
          <AlertProvider>
            <UserProvider>
              <GameProvider>{children}</GameProvider>
            </UserProvider>
          </AlertProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

// Initialize app
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

const root = createRoot(container);

root.render(
  <AppProviders>
    <App />
  </AppProviders>
);
