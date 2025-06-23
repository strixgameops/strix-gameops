import { apiRequest } from "../client.js";

// Analytics Queries
export const queryUniversalAnalytics = async (data, config = {}) =>
  apiRequest("/api/queryUniversalAnalytics", data, config);

export const queryInGameBalance = async (data, config = {}) =>
  apiRequest("/api/queryInGameBalance", data, config);

export const queryTopCurrencyProducts = async (data, config = {}) =>
  apiRequest("/api/queryTopCurrencyProducts", data, config);

export const queryTopProductsDiscountAndSpend = async (data, config = {}) =>
  apiRequest("/api/queryTopProductsDiscountAndSpend", data, config);

export const queryPaymentDrivers = async (data, config = {}) =>
  apiRequest("/api/queryPaymentDrivers", data, config);

export const queryTopSourcesAndSinks = async (data, config = {}) =>
  apiRequest("/api/queryTopSourcesAndSinks", data, config);

export const getRevenue = async (data, config = {}) =>
  apiRequest("/api/getRevenue", data, config);

export const getAvgCustomerProfile = async (data, config = {}) =>
  apiRequest("/api/getAvgCustomerProfile", data, config);

export const queryTopRealProducts = async (data, config = {}) =>
  apiRequest("/api/queryTopRealProducts", data, config);

export const queryPaymentsConversionFunnel = async (data, config = {}) =>
  apiRequest("/api/queryPaymentsConversionFunnel", data, config);

export const queryDaysToConvertToPayment = async (data, config = {}) =>
  apiRequest("/api/queryDaysToConvertToPayment", data, config);

export const queryOfferAnalytics = async (data, config = {}) =>
  apiRequest("/api/queryOfferAnalytics", data, config);

export const queryBehaviorAnalysis = async (data, config = {}) =>
  apiRequest("/api/queryBehaviorAnalysis", data, config);

export const queryPaymentConversion = async (data, config = {}) =>
  apiRequest("/api/queryPaymentsConversion", data, config);

// Metrics
export const getDAU = async (data, config = {}) =>
  apiRequest("/api/getDAU", data, config);

export const getCumulativeARPU = async (data, config = {}) =>
  apiRequest("/api/getCumulativeARPU", data, config);

export const getARPU = async (data, config = {}) =>
  apiRequest("/api/getARPU", data, config);

export const getARPPU = async (data, config = {}) =>
  apiRequest("/api/getARPPU", data, config);

export const getRetention = async (data, config = {}) =>
  apiRequest("/api/getRetention", data, config);

export const getRetentionBig = async (data, config = {}) =>
  apiRequest("/api/getRetentionBig", data, config);

export const getNewUsers = async (data, config = {}) =>
  apiRequest("/api/getNewUsers", data, config);

export const getRetentionByCountry = async (data, config = {}) =>
  apiRequest("/api/getRetentionByCountry", data, config);

export const getNewUsersByCountry = async (data, config = {}) =>
  apiRequest("/api/getNewUsersByCountry", data, config);

export const getSalesAndRevenueByCountry = async (data, config = {}) =>
  apiRequest("/api/getSalesAndRevenueByCountry", data, config);

export const getCombinedMetricsByCountry = async (data, config = {}) =>
  apiRequest("/api/getCombinedMetricsByCountry", data, config);

// Overview Statistics
export const getOverviewStatistics = async (data, config = {}) =>
  apiRequest("/api/getOverviewStatistics", data, config);

export const getOverviewStatisticsForPublisher = async (data, config = {}) =>
  apiRequest("/api/getOverviewStatisticsForPublisher", data, config);



