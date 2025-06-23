import { apiRequest } from "../client.js";

// Segments
export const getAllSegments = async (data, config = {}) =>
  apiRequest("/api/getAllSegments", data, config);

export const getSegmentsByIdArray = async (data, config = {}) =>
  apiRequest("/api/getSegmentsByIdArray", data, config);

export const createNewSegment = async (data, config = {}) =>
  apiRequest("/api/createNewSegment", data, config);

export const setSegmentName = async (data, config = {}) =>
  apiRequest("/api/setSegmentName", data, config);

export const setSegmentComment = async (data, config = {}) =>
  apiRequest("/api/setSegmentComment", data, config);

export const setSegmentConditions = async (data, config = {}) =>
  apiRequest("/api/setSegmentConditions", data, config);

export const refreshSegmentPlayerCount = async (data, config = {}) =>
  apiRequest("/api/refreshSegmentPlayerCount", data, config);

export const recalculateSegmentSize = async (data, config = {}) =>
  apiRequest("/api/recalculateSegmentSize", data, config);

export const removeSegmentByID = async (data, config = {}) =>
  apiRequest("/api/removeSegmentByID", data, config);

export const getAllSegmentsForAnalyticsFilter = async (data, config = {}) =>
  apiRequest("/api/getAllSegmentsForAnalyticsFilter", data, config);