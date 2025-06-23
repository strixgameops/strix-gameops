import { apiRequest } from "../client.js";

export const getUser = async (data, config = {}) =>
  apiRequest("/api/getUser", data, config);

export const setUserPermissions = async (data, config = {}) =>
  apiRequest("/api/setUserPermissions", data, config);

export const removeUser = async (data, config = {}) =>
  apiRequest("/api/removeUser", data, config);

export const cancelRemoveUser = async (data, config = {}) =>
  apiRequest("/api/cancelRemoveUser", data, config);

export const initiateChangeUserProfile = async (data, config = {}) =>
  apiRequest("/api/initiateChangeUserProfile", data, config);

export const confirmUserChangeProfileCode = async (data, config = {}) =>
  apiRequest("/api/confirmUserChangeProfileCode", data, config);

export const markUserTutorialState = async (data, config = {}) =>
  apiRequest("/api/markUserTutorialState", data, config);

export const updateCollabUserState = async (data, config = {}) =>
  apiRequest("/api/updateCollabUserState", data, config);

export const getCurrentCollabUsers = async (data, config = {}) =>
  apiRequest("/api/getCurrentCollabUsers", data, config);
