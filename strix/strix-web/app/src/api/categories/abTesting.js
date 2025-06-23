import { apiRequest } from "../client.js";

export const getABTests = async (data, config = {}) =>
  apiRequest("/api/getABTests", data, config);

export const getABTestsShort = async (data, config = {}) =>
  apiRequest("/api/getABTestsShort", data, config);

export const createABTest = async (data, config = {}) =>
  apiRequest("/api/createABTest", data, config);

export const removeABTest = async (data, config = {}) =>
  apiRequest("/api/removeABTest", data, config);

export const updateABTest = async (data, config = {}) =>
  apiRequest("/api/updateABTest", data, config);

export const queryABTestData = async (data, config = {}) =>
  apiRequest("/api/queryABTestData", data, config);
