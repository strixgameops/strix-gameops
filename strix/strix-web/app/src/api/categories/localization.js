import { apiRequest } from "../client.js";

export const updateLocalization = async (data, config = {}) =>
  apiRequest("/api/updateLocalization", data, config);

export const getGameLocalizationSettings = async (data, config = {}) =>
  apiRequest("/api/getGameLocalizationSettings", data, config);

export const updateGameLocalizationSettingsTag = async (data, config = {}) =>
  apiRequest("/api/updateGameLocalizationSettingsTag", data, config);

export const updateGameLocalizationSettingsPrefixGroup = async (
  data,
  config = {}
) => apiRequest("/api/updateGameLocalizationSettingsPrefixGroup", data, config);

export const getLocalization = async (data, config = {}) =>
  apiRequest("/api/getLocalization", data, config);

export const getLocalizationItems = async (data, config = {}) =>
  apiRequest("/api/getLocalizationItems", data, config);

export const removeLocalizationItem = async (data, config = {}) =>
  apiRequest("/api/removeLocalizationItem", data, config);

export const changeLocalizationItemKey = async (data, config = {}) =>
  apiRequest("/api/changeLocalizationItemKey", data, config);
