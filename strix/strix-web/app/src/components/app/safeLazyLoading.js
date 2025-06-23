import React, { lazy } from "react";

// Fallback component for failed imports
const ImportErrorFallback = ({ componentName, error }) => (
  <div style={{
    padding: "2rem",
    textAlign: "center",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "#f9f9f9"
  }}>
    <h3>Feature Not Available</h3>
    <p>The feature "{componentName}" is not available in this edition.</p>
    {process.env.NODE_ENV === 'development' && (
      <details style={{ marginTop: "1rem", textAlign: "left" }}>
        <summary>Error Details (Development Only)</summary>
        <pre style={{ fontSize: "0.8rem", color: "#666" }}>
          {error?.message || "Import failed - component may not exist"}
        </pre>
      </details>
    )}
  </div>
);

const safeLazy = (importFunc, componentName = "Unknown", isOptional = false) => {
  return lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      // Log the error for debugging
      if (!isOptional) {
        console.warn(`Failed to load component "${componentName}":`, error);
      } else {
      }
      
      // Return a module with a default export that renders the fallback
      return {
        default: () => (
          <ImportErrorFallback 
            componentName={componentName} 
            error={error} 
          />
        )
      };
    }
  });
};

// Conditional import that won't fail at build time
const conditionalImport = (importPath, fallbackName) => {
  return async () => {
    try {
      // Use dynamic import with variable to avoid static analysis
      const modulePath = importPath;
      return await import(/* @vite-ignore */ modulePath);
    } catch (error) {
      console.info(`Module ${importPath} not found, using fallback`);
      return {
        default: () => (
          <ImportErrorFallback 
            componentName={fallbackName} 
            error={error} 
          />
        )
      };
    }
  };
};
// Check if a module exists (for conditional routing)
const moduleExists = async (importFunc) => {
  try {
    await importFunc();
    return true;
  } catch {
    return false;
  }
};

export { safeLazy, ImportErrorFallback, moduleExists, conditionalImport };