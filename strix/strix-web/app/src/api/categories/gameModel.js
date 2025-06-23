import { apiRequest } from "../client.js";

export const gameModelCreateSegment = async (data, config = {}) =>
  apiRequest("/api/gameModelCreateSegment", data, config);

export const gameModelUpdateSegmentOverride = async (data, config = {}) =>
  apiRequest("/api/gameModelUpdateSegmentOverride", data, config);

export const gameModelRemoveSegment = async (data, config = {}) =>
  apiRequest("/api/gameModelRemoveSegment", data, config);

export const gameModelCreateOrUpdateVariable = async (data, config = {}) =>
  apiRequest("/api/gameModelCreateOrUpdateVariable", data, config);

export const gameModelRemoveVariable = async (data, config = {}) =>
  apiRequest("/api/gameModelRemoveVariable", data, config);

export const gameModelCreateOrUpdateFunction = async (data, config = {}) =>
  apiRequest("/api/gameModelCreateOrUpdateFunction", data, config);

export const gameModelRemoveFunction = async (data, config = {}) =>
  apiRequest("/api/gameModelRemoveFunction", data, config);

export const gameModelRemoveAllByCategory = async (data, config = {}) =>
  apiRequest("/api/gameModelRemoveAllByCategory", data, config);

export const gameModelManageFunctionLinkedConfigValue = async (
  data,
  config = {}
) => apiRequest("/api/gameModelManageFunctionLinkedConfigValue", data, config);

export const getBalanceModel = async (data, config = {}) =>
  apiRequest("/api/getBalanceModel", data, config);

export const gameModelCreateOrUpdateTab = async (data, config = {}) =>
  apiRequest("/api/gameModelCreateOrUpdateTab", data, config);

export const gameModelRemoveTab = async (data, config = {}) =>
  apiRequest("/api/gameModelRemoveTab", data, config);
