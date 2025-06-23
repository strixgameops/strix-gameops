import { safeLazy, ImportErrorFallback } from "./safeLazyLoading";

const createConditionalImport = (importPath, componentName) => {
  return safeLazy(
    async () => {
      try {
        // Dynamic import with computed string to avoid static analysis
        const segments = importPath.split('/');
        const path = segments.join('/');
        return await import(/* webpackIgnore: true */ path);
      } catch (error) {
        // Return fallback component
        return {
          default: () => (
            <ImportErrorFallback 
              componentName={componentName} 
              error={error} 
            />
          )
        };
      }
    },
    componentName,
    true // isOptional
  );
};

export const AudienceCluster = createConditionalImport(
  "../pages/enterprise/clustering/AudienceCluster",
  "AudienceCluster"
);

export const Flows = createConditionalImport(
  "../pages/enterprise/flows/Flows", 
  "Flows"
);

export const PushNotifications = createConditionalImport(
  "../pages/enterprise/pushNotifications/PushNotifications",
  "PushNotifications"
);

export const DashboardMon_RealMoney = createConditionalImport(
  "../pages/enterprise/DashboardMon_RealMoney",
  "DashboardMon_RealMoney"
);
