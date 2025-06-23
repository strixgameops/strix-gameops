import { apiRequest } from "../client.js";

export const getWarehouseTemplates = async (data, config = {}) =>
  apiRequest("/api/getWarehouseTemplates", data, config);

export const addStatisticsTemplate = async (data, config = {}) =>
  apiRequest("/api/addStatisticsTemplate", data, config);

export const updateStatisticsTemplate = async (data, config = {}) =>
  apiRequest("/api/updateStatisticsTemplate", data, config);

export const removeWarehouseTemplate = async (data, config = {}) =>
  apiRequest("/api/removeWarehouseTemplate", data, config);

export const getWarehousePlayers = async (data, config = {}) =>
  apiRequest("/api/getWarehousePlayers", data, config);

export const getWarehousePlayerData = async (data, config = {}) =>
  apiRequest("/api/getWarehousePlayerData", data, config);

export const addAnalyticsTemplate = async (data, config = {}) =>
  apiRequest("/api/addAnalyticsTemplate", data, config);

export const countPlayersInWarehouse = async (data, config = {}) =>
  apiRequest("/api/countPlayersInWarehouse", data, config);

export const getTemplatesForSegments = async (data, config = {}) =>
  apiRequest("/api/getTemplatesForSegments", data, config);

export const queryWarehousePlayers = async (data, config = {}) =>
  apiRequest("/api/queryWarehousePlayers", data, config);

export const forceSetStatisticsElement = async (data, config = {}) =>
  apiRequest("/api/forceSetStatisticsElement", data, config);

export const getLeaderboards = async (data, config = {}) =>
  apiRequest("/api/getLeaderboards", data, config);

export const addLeaderboard = async (data, config = {}) =>
  apiRequest("/api/addLeaderboard", data, config);

export const removeLeaderboard = async (data, config = {}) =>
  apiRequest("/api/removeLeaderboard", data, config);

export const updateLeaderboard = async (data, config = {}) =>
  apiRequest("/api/updateLeaderboard", data, config);

export const getLeaderboardTop = async (data, config = {}) =>
  apiRequest("/api/getLeaderboardTop", data, config);
