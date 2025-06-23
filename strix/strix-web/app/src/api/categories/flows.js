import { apiRequest } from "../client.js";

export const saveFlow = async (data, config = {}) =>
  apiRequest("/api/saveFlow", data, config);

export const addFlow = async (data, config = {}) =>
  apiRequest("/api/addFlow", data, config);

export const removeFlow = async (data, config = {}) =>
  apiRequest("/api/removeFlow", data, config);

export const getFlows = async (data, config = {}) =>
  apiRequest("/api/getFlows", data, config);

export const getFlowsShort = async (data, config = {}) =>
  apiRequest("/api/getFlowsShort", data, config);

export const handleSplitPathCreation = async (data, config = {}) =>
  apiRequest("/api/handleSplitPathCreation", data, config);
