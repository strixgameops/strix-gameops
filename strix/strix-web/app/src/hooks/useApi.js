import { useRef, useCallback, useState } from "react";
import { useAlert } from "../contexts/AlertsContext.jsx";
import * as api from "../api/index.js";

const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

const useApi = () => {
  const { triggerAlert } = useAlert();
  const abortControllers = useRef(new Set());
  const [loading, setLoading] = useState(false);
  const [requestCounts, setRequestCounts] = useState({});

  const cleanup = useCallback(() => {
    abortControllers.current.forEach((controller) => {
      controller.abort();
    });
    abortControllers.current.clear();
  }, []);

  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    abortControllers.current.add(controller);

    const removeController = () => {
      abortControllers.current.delete(controller);
    };

    return { controller, removeController };
  }, []);

  const updateRequestCount = useCallback((methodName, increment) => {
    setRequestCounts((prev) => ({
      ...prev,
      [methodName]: (prev[methodName] || 0) + increment,
    }));
  }, []);

  const handleRequest = useCallback(
    async (apiMethod, methodName, options = {}, ...args) => {
      const {
        showErrorAlert = true,
        showSuccessAlert = false,
        successMessage = "Operation completed successfully",
        customErrorHandler = null,
        updateGlobalLoading = true,
      } = options;

      const { controller, removeController } = createAbortController();

      updateRequestCount(methodName, 1);
      if (updateGlobalLoading) setLoading(true);

      try {
        let result;
        const signalConfig = { signal: controller.signal };

        if (args.length === 0) {
          // No arguments, just pass config with signal
          result = await apiMethod(signalConfig);
        } else if (args.length === 1) {
          // Single argument - could be data or config
          const arg = args[0];
          if (arg && typeof arg === 'object' && ('method' in arg || 'url' in arg || 'headers' in arg)) {
            // Looks like a config object
            result = await apiMethod({ ...arg, signal: controller.signal });
          } else {
            // Looks like data
            result = await apiMethod(arg, signalConfig);
          }
        } else {
          // Multiple arguments - assume last is config if object, otherwise add config
          const lastArg = args[args.length - 1];
          if (lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg)) {
            // Merge signal into existing config
            const newArgs = [...args];
            newArgs[newArgs.length - 1] = { ...lastArg, signal: controller.signal };
            result = await apiMethod(...newArgs);
          } else {
            // Add signal as new config parameter
            result = await apiMethod(...args, signalConfig);
          }
        }

        if (showSuccessAlert && result?.success) {
          triggerAlert(successMessage, "success", false);
        }

        return result;
      } catch (error) {
        if (error.name === "AbortError" || error.message === "canceled") {
          console.log(`Request ${methodName} was aborted`);
          return { success: false, aborted: true };
        }

        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          DEFAULT_ERROR_MESSAGE;

        const errorDetails = {
          error: error.toString(),
          method: methodName,
          url: window.location.pathname,
          timestamp: new Date().toISOString(),
          statusCode: error.response?.status,
          requestId: error.response?.headers?.["x-request-id"],
        };

        if (customErrorHandler) {
          customErrorHandler(error, errorDetails);
        } else if (showErrorAlert) {
          triggerAlert(
            errorMessage,
            "error",
            true,
            JSON.stringify(errorDetails)
          );
        }

        console.error(`API Error in ${methodName}:`, error, errorDetails);

        return {
          success: false,
          error: errorMessage,
          details: errorDetails,
        };
      } finally {
        removeController();
        updateRequestCount(methodName, -1);

        setTimeout(() => {
          if (updateGlobalLoading && abortControllers.current.size === 0) {
            setLoading(false);
          }
        }, 100);
      }
    },
    [triggerAlert, createAbortController, updateRequestCount]
  );

  // Create wrapped API methods
  const wrappedApi = Object.fromEntries(
    Object.entries(api).map(([methodName, apiMethod]) => [
      methodName,
      (firstArg = {}, ...args) => {
        // Check if first argument is options by looking for known option keys
        const isOptions = firstArg && typeof firstArg === 'object' &&
          (firstArg.showErrorAlert !== undefined ||
           firstArg.showSuccessAlert !== undefined ||
           firstArg.successMessage !== undefined ||
           firstArg.customErrorHandler !== undefined ||
           firstArg.updateGlobalLoading !== undefined);

        if (isOptions) {
          return handleRequest(apiMethod, methodName, firstArg, ...args);
        } else {
          // First argument is data, not options
          return handleRequest(apiMethod, methodName, {}, firstArg, ...args);
        }
      },
    ])
  );

  // Utility methods
  const isLoading = useCallback(
    (methodName) => {
      return methodName ? (requestCounts[methodName] || 0) > 0 : loading;
    },
    [requestCounts, loading]
  );

  const cancelAllRequests = useCallback(() => {
    cleanup();
    setLoading(false);
    setRequestCounts({});
  }, []);

  const cancelRequest = useCallback((methodName) => {
    console.warn("cancelRequest not implemented for specific methods");
  }, []);

  return {
    ...wrappedApi,

    // State
    loading,
    isLoading,
    requestCounts,

    // Utilities
    cleanup,
    cancelAllRequests,
    cancelRequest,
  };
};

export default useApi;
