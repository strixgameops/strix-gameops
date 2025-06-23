import { apiRequest } from "../client.js";

export const login = async (data, config = {}) =>
  apiRequest("/api/login", data, config);

export const register = async (data, config = {}) =>
  apiRequest("/api/register", data, config);

export const signout = async (data, config = {}) =>
  apiRequest("/api/logout", data, config);

export const startRegistrationProcess = async (data, config = {}) =>
  apiRequest("/api/startRegistrationProcess", data, config);

export const finishRegistrationProcess = async (data, config = {}) =>
  apiRequest("/api/finishRegistrationProcess", data, config);

export const finishInitialOnboarding = async (data, config = {}) =>
  apiRequest("/api/finishInitialOnboarding", data, config);

export const sendContactUs = async (data, config = {}) =>
  apiRequest("/api/sendContactUs", data, config);

export const sendBugReport = async (data, config = {}) =>
  apiRequest("/api/sendBugReport", data, config);

export const buildDemo = async (config = {}) =>
  apiRequest("/api/buildDemo", {}, config);
