import { apiRequest } from "../client.js";

export const cookBranchContent = async (data, config = {}) =>
  apiRequest("/api/cookBranchContent", data, config);

export const getGameDeploymentCatalog = async (data, config = {}) =>
  apiRequest("/api/getGameDeploymentCatalog", data, config);

export const removeDeploymentVersion = async (data, config = {}) =>
  apiRequest("/api/removeDeploymentVersion", data, config);

export const updateGameDeploymentCatalog = async (data, config = {}) =>
  apiRequest("/api/updateGameDeploymentCatalog", data, config);

export const getDeploymentChecksums = async (data, config = {}) =>
  apiRequest("/api/getDeploymentChecksums", data, config);

export const getCurrentAudienceDeploymentStats = async (data, config = {}) =>
  apiRequest("/api/getCurrentAudienceDeploymentStats", data, config);

export const getLatestDeployedBranches = async (data, config = {}) =>
  apiRequest("/api/getLatestDeployedBranches", data, config);

export const getAllActionLogs = async (data, config = {}) =>
  apiRequest("/api/getAllActionLogs", data, config);

export const getActionLogsByType = async (data, config = {}) =>
  apiRequest("/api/getActionLogsByType", data, config);
