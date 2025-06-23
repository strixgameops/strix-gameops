import { apiRequest } from "../client.js";
// Profile Composition
export const getProfileComposition = async (data, config = {}) =>
  apiRequest("/api/getProfileComposition", data, config);

export const getProfileCompositionPreset = async (data, config = {}) =>
  apiRequest("/api/getProfileCompositionPreset", data, config);

export const setProfileCompositionPreset = async (data, config = {}) =>
  apiRequest("/api/setProfileCompositionPreset", data, config);

export const buildStaticSegmentFromComposition = async (data, config = {}) =>
  apiRequest("/api/buildStaticSegmentFromComposition", data, config);

export const buildStaticSegmentFromClientIDs = async (data, config = {}) =>
  apiRequest("/api/buildStaticSegmentFromClientIDs", data, config);