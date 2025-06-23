import React, { Suspense, lazy, useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@strix/userContext";
import { useGame } from "@strix/gameContext";
import useApi from "@strix/hooks/useApi";
import { Helmet } from "react-helmet";

import { safeLazy } from "./safeLazyLoading";

// Core components (keep these as regular imports since they're critical)
import Navbar from "../pages/navbar/Navbar";
import StrixUpperbar from "../pages/upperbar/StrixUpperbar";
import LockPlaceholder from "../pages/collabLock/LockPlaceholder";
import { PageLoading } from "../shared/LoadingScreen";
import ErrorBoundary from "../shared/errorBoundary/ErrorBoundary";

import {
  AudienceCluster,
  Flows,
  PushNotifications,
} from "./conditionalImports";

// Safe lazy load page components
const Overview = safeLazy(
  () => import("../pages/overview/Overview"),
  "Overview"
);
const DemoBadge = safeLazy(
  () => import("../pages/demo/DemoBadge"),
  "DemoBadge"
);

// Auth pages
const SignOut = safeLazy(() => import("../pages/auth/Signout"), "SignOut");
const UnauthorizedErrorPage = safeLazy(
  () => import("../pages/auth/UnauthorizedErrorPage"),
  "UnauthorizedErrorPage"
);

// Planning pages
const Entities = safeLazy(
  () => import("../pages/planning/entities/Entities"),
  "Entities"
);
const PublishedNodeContent = safeLazy(
  () => import("../pages/planning/publishedNode/PublishedNode"),
  "PublishedNodeContent"
);

// Analytics pages
const Segmentation = safeLazy(
  () => import("../pages/analytics/segmentation/Segmentation"),
  "Segmentation"
);
const PlayerWarehouse = safeLazy(
  () => import("../pages/analytics/playerWarehouse/PlayerWarehouse"),
  "PlayerWarehouse"
);
const ABTesting = safeLazy(
  () => import("../pages/analytics/abtesting/ABTesting"),
  "ABTesting"
);
const CustomCharts = safeLazy(
  () => import("../pages/analytics/charts/CustomCharts"),
  "CustomCharts"
);
const CustomDashboards = safeLazy(
  () => import("../pages/analytics/charts/CustomDashboards"),
  "CustomDashboards"
);
const Engagement = safeLazy(
  () => import("../pages/analytics/behaviorTree/BehaviorTree"),
  "Engagement"
);
const Composition = safeLazy(
  () => import("../pages/analytics/playerComposition/PlayerComposition"),
  "Composition"
);
const AnalyticsEvents = safeLazy(
  () => import("../pages/analytics/analyticsEvents/AnalyticEvents"),
  "AnalyticsEvents"
);
const Dashboards = safeLazy(
  () => import("../pages/analytics/dashboards/Dashboards"),
  "Dashboards"
);

// LiveOps pages
const Offers = safeLazy(
  () => import("../pages/liveops/offers/Offers"),
  "Offers"
);
const GameEvents = safeLazy(
  () => import("../pages/liveops/gameevents/GameEvents"),
  "GameEvents"
);
const Localization = safeLazy(
  () => import("../pages/liveops/localization/Localization"),
  "Localization"
);
const Deployment = safeLazy(
  () => import("../pages/liveops/deployment/Deployment"),
  "Deployment"
);
const AssetDelivery = safeLazy(
  () => import("../pages/liveops/assetdelivery/AssetDelivery"),
  "AssetDelivery"
);
const GameModel = safeLazy(
  () => import("../pages/liveops/model/GameModel"),
  "GameModel"
);

// Other pages
const Profile = safeLazy(() => import("../pages/profile/Profile"), "Profile");
const DemoEntryPage = safeLazy(
  () => import("../pages/demo/DemoEntryPage"),
  "DemoEntryPage"
);

// Context wrapper for localization
const LocalizationTableProvider = safeLazy(
  () =>
    import("../../contexts/LocalizationTableContext").then((module) => ({
      default: module.LocalizationTableProvider,
    })),
  "LocalizationTableProvider"
);

// Game selection component
const GameSelectionPrompt = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "50vh",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h2>No Game Selected</h2>
      <p>Please select a game to continue using the application.</p>
      <p>
        You will be redirected to the Overview page shortly if no game is
        selected.
      </p>
    </div>
  );
};

// Routes that should always be accessible regardless of game selection
const publicRoutes = [
  "/node/*",
  "/unauthorized",
  "/demo",
  "/signout",
  "/overview",
  "/",
];

const AuthenticatedApp = () => {
  const { userProfile } = useUser();
  const { game, activePageLocks, branch, environment } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [gameCheckTimeout, setGameCheckTimeout] = useState(null);
  const [hasRedirectedFromLogin, setHasRedirectedFromLogin] = useState(false);

  // Handle game selection timeout
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isPublicRoute = publicRoutes.some((route) =>
      route.endsWith("*")
        ? currentPath.startsWith(route.slice(0, -1))
        : route === currentPath
    );

    // If no game is selected and not on a public route
    if (!game && !isPublicRoute) {
      // Set timeout to redirect to overview after 30 seconds
      const timeout = setTimeout(() => {
        console.log("No game selected, redirecting to overview");
        navigate("/overview");
      }, 30000); // 30 seconds

      setGameCheckTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    } else {
      // Clear any existing timeout if game is selected or on public route
      if (gameCheckTimeout) {
        clearTimeout(gameCheckTimeout);
        setGameCheckTimeout(null);
      }
    }
  }, [game]);

  const checkLockAuthority = () => {
    return activePageLocks.find((lock) => lock.email === userProfile?.email)
      ?.isOwner;
  };

  const hasActiveLocks = activePageLocks && activePageLocks.length > 1;
  const isLockOwner = checkLockAuthority();
  const shouldShowLockPlaceholder = hasActiveLocks && !isLockOwner;

  // Check if current route requires game selection
  const currentPath = window.location.pathname;
  const isPublicRoute = publicRoutes.some((route) =>
    route.endsWith("*")
      ? currentPath.startsWith(route.slice(0, -1))
      : route === currentPath
  );

  const requiresGameSelection = !game && !isPublicRoute;

  useEffect(() => {
    // Only redirect once when the component first mounts after authentication
    if (!hasRedirectedFromLogin && userProfile) {
      const redirectTo = location.state?.from?.pathname || "/overview";
      console.log("Redirecting newly authenticated user to:", redirectTo);
      navigate(redirectTo, { replace: true });
      setHasRedirectedFromLogin(true);
    }
  }, [userProfile, hasRedirectedFromLogin, navigate, location.state]);

  return (
    <>
      <Helmet>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${window.__env.gtag}`}
        ></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${window.__env.gtag}');
          `}
        </script>
      </Helmet>
      {isDemoUser && (
        <Suspense fallback={null}>
          <DemoBadge />
        </Suspense>
      )}

      <Navbar />

      <div className="page-content">
        <StrixUpperbar />

        {shouldShowLockPlaceholder && <LockPlaceholder />}

        {requiresGameSelection ? (
          <GameSelectionPrompt />
        ) : (
          <ErrorBoundary>
            <Suspense fallback={<PageLoading />}>
              <Routes
                key={`${game?.gameID + branch + environment}` || "no-game"}
              >
                {/* Public routes that don't require game selection */}
                <Route path="/node/:link" element={<PublishedNodeContent />} />
                <Route
                  path="/unauthorized"
                  element={<UnauthorizedErrorPage />}
                />
                <Route path="/demo" element={<DemoEntryPage />} />
                <Route path="/signout" element={<SignOut />} />

                {/* Main application routes */}
                <Route path="/overview" element={<Overview />} />
                <Route path="/" element={<Overview />} />

                {/* Planning routes */}
                <Route path="/entities" element={<Entities />} />

                {/* Analytics routes */}
                <Route path="/segmentation" element={<Segmentation />} />
                <Route path="/playerwarehouse" element={<PlayerWarehouse />} />
                <Route path="/abtesting" element={<ABTesting />} />
                <Route path="/charts" element={<CustomCharts />} />
                <Route
                  path="/customdashboards"
                  element={<CustomDashboards />}
                />
                <Route path="/behavior/retention" element={<Engagement />} />
                <Route path="/behaviorTree" element={<Engagement />} />
                <Route path="/profileComposition" element={<Composition />} />
                <Route path="/allevents" element={<AnalyticsEvents />} />

                {/* Enterprise routes - these will show fallback if components don't exist */}
                <Route path="/clustering" element={<AudienceCluster />} />
                <Route path="/flows" element={<Flows />} />
                <Route
                  path="/pushNotifications"
                  element={<PushNotifications />}
                />

                {/* Dashboard routes */}
                <Route path="/dashboards/:link" element={<Dashboards />} />

                {/* LiveOps routes */}
                <Route path="/offers" element={<Offers />} />
                <Route path="/gameevents" element={<GameEvents />} />
                <Route
                  path="/localization"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <LocalizationTableProvider>
                        <Localization />
                      </LocalizationTableProvider>
                    </Suspense>
                  }
                />
                <Route path="/deployment" element={<Deployment />} />
                <Route path="/assetdelivery" element={<AssetDelivery />} />
                <Route path="/model" element={<GameModel />} />

                {/* User profile */}
                <Route path="/profile" element={<Profile />} />

                {/* Catch-all route */}
                <Route path="*" element={<Overview />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </>
  );
};

export default AuthenticatedApp;
