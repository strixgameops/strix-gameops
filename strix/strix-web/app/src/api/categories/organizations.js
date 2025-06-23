import { apiRequest } from "../client.js";

// Publishers
export const getPublishers = async (data, config = {}) =>
  apiRequest("/api/getPublishers", data, config);

export const getPublisherStudios = async (data, config = {}) =>
  apiRequest("/api/getPublisherStudios", data, config);

export const getOrganizationsInfo = async (data, config = {}) =>
  apiRequest("/api/getOrganizationsInfo", data, config);

export const checkOrganizationAuthority = async (data, config = {}) =>
  apiRequest("/api/checkOrganizationAuthority", data, config);

// Studios
export const addStudio = async (data, config = {}) =>
  apiRequest("/api/addStudio", data, config);

export const removeStudio = async (data, config = {}) =>
  apiRequest("/api/removeStudio", data, config);

export const cancelRemoveStudio = async (data, config = {}) =>
  apiRequest("/api/cancelRemoveStudio", data, config);

export const getStudioDetails = async (data, config = {}) =>
  apiRequest("/api/getStudioDetails", data, config);

export const updateStudioDetails = async (data, config = {}) =>
  apiRequest("/api/updateStudioDetails", data, config);

export const removeUserFromOrganization = async (data, config = {}) =>
  apiRequest("/api/removeUserFromOrganization", data, config);

export const addUserToOrganization = async (data, config = {}) =>
  apiRequest("/api/addUserToOrganization", data, config);

// Games
export const getStudioGames = async (data, config = {}) =>
  apiRequest("/api/getStudioGames", data, config);

export const createGame = async (data, config = {}) =>
  apiRequest("/api/createGame", data, config);

export const getGameDetails = async (data, config = {}) =>
  apiRequest("/api/getGameDetails", data, config);

export const updateGameDetails = async (data, config = {}) =>
  apiRequest("/api/updateGameDetails", data, config);

export const removeGame = async (data, config = {}) =>
  apiRequest("/api/removeGame", data, config);

export const cancelRemoveGame = async (data, config = {}) =>
  apiRequest("/api/cancelRemoveGame", data, config);

export const revokeGameKey = async (data, config = {}) =>
  apiRequest("/api/revokeGameKey", data, config);

export const getListOfEnvironments = async (data, config = {}) =>
  apiRequest("/api/getListOfEnvironments", data, config);
