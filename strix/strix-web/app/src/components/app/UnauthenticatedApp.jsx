import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoading } from "../shared/LoadingScreen";
import ErrorBoundary from "../shared/errorBoundary/ErrorBoundary";

// Lazy load auth components
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const DemoEntryPage = lazy(() => import("../pages/demo/DemoEntryPage"));
const PublishedNodeContent = lazy(
  () => import("../pages/planning/publishedNode/PublishedNode")
);

const UnauthenticatedApp = () => {
  return (
    <div className="page-content">
      <ErrorBoundary>
        <Suspense fallback={<PageLoading message="Loading..." />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {window.__env.allowRegistration == "true" && (
              <Route path="/register" element={<Register />} />
            )}
            {/* Public routes available without authentication */}
            {window.__env.edition !== "community" && (
              <>
                <Route path="/demo" element={<DemoEntryPage />} />
              </>
            )}
            <Route path="/node/:link" element={<PublishedNodeContent />} />

            {/* Redirect all other routes to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default UnauthenticatedApp;
