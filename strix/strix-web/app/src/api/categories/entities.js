import { apiRequest } from "../client.js";

export const createEntity = async (data, config = {}) =>
  apiRequest("/api/createEntity", data, config);

export const createEntityBulk = async (data, config = {}) =>
  apiRequest("/api/createEntityBulk", data, config);

export const saveEntityBasicInfo = async (data, config = {}) =>
  apiRequest("/api/saveEntityBasicInfo", data, config);

export const saveEntityGroupName = async (data, config = {}) =>
  apiRequest("/api/saveEntityGroupName", data, config);

export const saveEntityRoles = async (data, config = {}) =>
  apiRequest("/api/saveEntityRoles", data, config);

export const saveEntityIcon = async (data, config = {}) =>
  apiRequest("/api/saveEntityIcon", data, config);

export const saveEntityMainConfigs = async (data, config = {}) =>
  apiRequest("/api/saveEntityMainConfigs", data, config);

export const saveEntityInheritedConfigs = async (data, config = {}) =>
  apiRequest("/api/saveEntityInheritedConfigs", data, config);

export const getEntitiesByNodeIDs = async (data, config = {}) =>
  apiRequest("/api/getEntitiesByNodeIDs", data, config);

export const getEntitiesIDs = async (data, config = {}) =>
  apiRequest("/api/getEntitiesIDs", data, config);

export const getEntitiesNames = async (data, config = {}) =>
  apiRequest("/api/getEntitiesNames", data, config);

export const getEntityIcon = async (data, config = {}) =>
  apiRequest("/api/getEntityIcon", data, config);

export const getEntityIcons = async (data, config = {}) =>
  apiRequest("/api/getEntityIcons", data, config);

export const getCurrencyEntities = async (data, config = {}) =>
  apiRequest("/api/getCurrencyEntities", data, config);
