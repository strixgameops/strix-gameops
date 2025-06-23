import { apiRequest } from "../client.js";

export const getGameEvents = async (data, config = {}) =>
  apiRequest("/api/getGameEvents", data, config);

export const updateGameEvent = async (data, config = {}) =>
  apiRequest("/api/updateGameEvent", data, config);

export const removeGameEvent = async (data, config = {}) =>
  apiRequest("/api/removeGameEvent", data, config);

export const createGameEvent = async (data, config = {}) =>
  apiRequest("/api/createGameEvent", data, config);

export const removeEntityFromGameEvent = async (data, config = {}) =>
  apiRequest("/api/removeEntityFromGameEvent", data, config);

export const getGameEventsNotes = async (data, config = {}) =>
  apiRequest("/api/getGameEventsNotes", data, config);

export const updateGameEventsNotes = async (data, config = {}) =>
  apiRequest("/api/updateGameEventsNotes", data, config);
