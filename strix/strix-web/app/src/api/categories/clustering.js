import { apiRequest } from "../client.js";
// Clustering
export const requestAudienceCluster = async (data, config = {}) =>
  apiRequest("/api/requestAudienceCluster", data, config);

export const getAudienceClustersList = async (data, config = {}) =>
  apiRequest("/api/getAudienceClustersList", data, config);

export const getAudienceCluster = async (data, config = {}) =>
  apiRequest("/api/getAudienceCluster", data, config);

export const stopClusterBuilding = async (data, config = {}) =>
  apiRequest("/api/stopClusterBuilding", data, config);

export const getClusteredPlayers = async (data, config = {}) =>
  apiRequest("/api/getClusteredPlayers", data, config);

export const getPlayersProfileByClientIDs = async (data, config = {}) =>
  apiRequest("/api/getPlayersProfileByClientIDs", data, config);
