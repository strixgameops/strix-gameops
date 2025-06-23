import { apiRequest } from "../client.js";

export const createNewOffer = async (data, config = {}) =>
  apiRequest("/api/createNewOffer", data, config);

export const updateOffer = async (data, config = {}) =>
  apiRequest("/api/updateOffer", data, config);

export const getOffers = async (data, config = {}) =>
  apiRequest("/api/getOffers", data, config);

export const removeOffer = async (data, config = {}) =>
  apiRequest("/api/removeOffer", data, config);

export const getOffersNames = async (data, config = {}) =>
  apiRequest("/api/getOffersNames", data, config);

export const getOffersByContentNodeID = async (data, config = {}) =>
  apiRequest("/api/getOffersByContentNodeID", data, config);

export const getOfferAnalytics = async (data, config = {}) =>
  apiRequest("/api/getOfferAnalytics", data, config);

// Positioned Offers
export const updatePositionedOffers = async (data, config = {}) =>
  apiRequest("/api/updatePositionedOffers", data, config);

export const removePositionedOffer = async (data, config = {}) =>
  apiRequest("/api/removePositionedOffer", data, config);

export const getPositionedOffers = async (data, config = {}) =>
  apiRequest("/api/getPositionedOffers", data, config);

// Pricing
export const getPricing = async (data, config = {}) =>
  apiRequest("/api/getPricing", data, config);

export const getPricingAutoFilledRegions = async (data, config = {}) =>
  apiRequest("/api/getPricingAutoFilledRegions", data, config);

export const updatePricingTemplate = async (data, config = {}) =>
  apiRequest("/api/updatePricingTemplate", data, config);

export const createPricingTemplate = async (data, config = {}) =>
  apiRequest("/api/createPricingTemplate", data, config);

export const removePricingTemplate = async (data, config = {}) =>
  apiRequest("/api/removePricingTemplate", data, config);
