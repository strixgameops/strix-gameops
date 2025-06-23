import { apiRequest } from "../client.js";

export const createNewRemoteConfigParam = async (data, config = {}) =>
  apiRequest("/api/createNewRemoteConfigParam", data, config);

export const getRemoteConfigParams = async (data, config = {}) =>
  apiRequest("/api/getRemoteConfigParams", data, config);

export const checkIfRCParamCodeNameExists = async (data, config = {}) =>
  apiRequest("/api/checkIfRCParamCodeNameExists", data, config);

export const updateRemoteConfigParam = async (data, config = {}) =>
  apiRequest("/api/updateRemoteConfigParam", data, config);

export const removeRemoteConfigParam = async (data, config = {}) =>
  apiRequest("/api/removeRemoteConfigParam", data, config);

export const getCategorizedRemoteConfigParams = async (data, config = {}) =>
  apiRequest("/api/getCategorizedRemoteConfigParams", data, config);

export const getRCValueBySegmentID = async (data, config = {}) =>
  apiRequest("/api/getRCValueBySegmentID", data, config);
