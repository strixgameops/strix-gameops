import { apiRequest } from "../client.js";

export const getDashboards = async (data, config = {}) =>
  apiRequest("/api/getDashboards", data, config);

export const getCustomDashboardChart = async (data, config = {}) =>
  apiRequest("/api/getCustomDashboardChart", data, config);

export const updateCustomDashboardChart = async (data, config = {}) =>
  apiRequest("/api/updateCustomDashboardChart", data, config);

export const getDashboardByLink = async (data, config = {}) =>
  apiRequest("/api/getDashboardByLink", data, config);

export const addCustomDashboard = async (data, config = {}) =>
  apiRequest("/api/addCustomDashboard", data, config);

export const addChartToCustomDashboard = async (data, config = {}) =>
  apiRequest("/api/addChartToCustomDashboard", data, config);

export const removeChartFromCustomDashboard = async (data, config = {}) =>
  apiRequest("/api/removeChartFromCustomDashboard", data, config);

export const updateCustomDashboard = async (data, config = {}) =>
  apiRequest("/api/updateCustomDashboard", data, config);

export const updateCustomDashboardCharts = async (data, config = {}) =>
  apiRequest("/api/updateCustomDashboardCharts", data, config);

export const removeCustomDashboard = async (data, config = {}) =>
  apiRequest("/api/removeCustomDashboard", data, config);

// Alerts
export const createAlert = async (data, config = {}) =>
  apiRequest("/api/createAlert", data, config);

export const updateAlert = async (data, config = {}) =>
  apiRequest("/api/updateAlert", data, config);

export const removeAlert = async (data, config = {}) =>
  apiRequest("/api/removeAlert", data, config);

export const removeAlertsWithChartID = async (data, config = {}) =>
  apiRequest("/api/removeAlertsWithChartID", data, config);

export const getAlertsByChartID = async (data, config = {}) =>
  apiRequest("/api/getAlertsByChartID", data, config);

export const getAllAlerts = async (data, config = {}) =>
  apiRequest("/api/getAllAlerts", data, config);
