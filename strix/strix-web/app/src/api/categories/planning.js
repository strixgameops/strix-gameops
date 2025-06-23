import { apiRequest } from "../client.js";

export const getNodeTree = async (data, config = {}) =>
  apiRequest("/api/getNodeTree", data, config);

export const addChildNodeInTree = async (data, config = {}) =>
  apiRequest("/api/addChildNodeInTree", data, config);

export const moveNodeInTree = async (data, config = {}) =>
  apiRequest("/api/moveNodeInTree", data, config);

export const getPlanningNodes = async (data, config = {}) =>
  apiRequest("/api/getPlanningNodes", data, config);

export const getNode = async (data, config = {}) =>
  apiRequest("/api/getNode", data, config);

export const removePlanningNode = async (data, config = {}) =>
  apiRequest("/api/removePlanningNode", data, config);

export const cancelEntityCreation = async (data, config = {}) =>
  apiRequest("/api/cancelEntityCreation", data, config);

export const createPlanningGameplay = async (data, config = {}) =>
  apiRequest("/api/createPlanningGameplay", data, config);

export const removeNodeFromTree = async (data, config = {}) =>
  apiRequest("/api/removeNodeFromTree", data, config);

export const updateNode = async (data, config = {}) =>
  apiRequest("/api/updateNode", data, config);

export const checkEntityIDExists = async (data, config = {}) =>
  apiRequest("/api/checkEntityIDExists", data, config);

export const publishNode = async (data, config = {}) =>
  apiRequest("/api/publishNode", data, config);

export const unPublishNode = async (data, config = {}) =>
  apiRequest("/api/unPublishNode", data, config);

export const getIsNodePublished = async (data, config = {}) =>
  apiRequest("/api/getIsNodePublished", data, config);

export const getPublishedNode = async (data, config = {}) =>
  apiRequest("/api/getPublishedNode", data, config);
