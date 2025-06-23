import { apiRequest } from "../client.js";

// Analytics Events
export const createNewAnalyticsEvent = async (data, config = {}) =>
  apiRequest("/api/createNewAnalyticsEvent", data, config);

export const removeAnalyticsEvent = async (data, config = {}) =>
  apiRequest("/api/removeAnalyticsEvent", data, config);

export const checkIfAnalyticsEventIDExists = async (data, config = {}) =>
  apiRequest("/api/checkIfAnalyticsEventIDExists", data, config);

export const updateAnalyticsEvent = async (data, config = {}) =>
  apiRequest("/api/updateAnalyticsEvent", data, config);

export const removeAnalyticsEventValue = async (data, config = {}) =>
  apiRequest("/api/removeAnalyticsEventValue", data, config);

export const getAllAnalyticsEvents = async (data, config = {}) =>
  apiRequest("/api/getAllAnalyticsEvents", data, config);

export const getAnalyticsEvent = async (data, config = {}) =>
  apiRequest("/api/getAnalyticsEvent", data, config);

export const getAnalyticsEvents = async (data, config = {}) =>
  apiRequest("/api/getAnalyticsEvents", data, config);

export const getRecentAnalyticsEvents = async (data, config = {}) =>
  apiRequest("/api/getRecentAnalyticsEvents", data, config);