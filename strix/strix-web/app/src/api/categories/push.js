import { apiRequest } from "../client.js";

export const getPushCampaigns = async (data, config = {}) =>
  apiRequest("/api/getPushCampaigns", data, config);

export const createPushCampaign = async (data, config = {}) =>
  apiRequest("/api/createPushCampaign", data, config);

export const removePushCampaign = async (data, config = {}) =>
  apiRequest("/api/removePushCampaign", data, config);

export const updatePushCampaign = async (data, config = {}) =>
  apiRequest("/api/updatePushCampaign", data, config);

export const testPushNotification = async (data, config = {}) =>
  apiRequest("/api/testPushNotification", data, config);
