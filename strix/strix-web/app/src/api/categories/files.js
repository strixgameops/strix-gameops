import { apiRequest } from "../client.js";
import axios from "axios";

export const uploadFileToStudioCloud = async (data, config = {}) =>
  apiRequest("/api/uploadFileToStudioCloud", data, config);

export const fetchFileFromStudioCloud = async (data, config = {}) =>
  apiRequest("/api/fetchFileFromStudioCloud", data, config);

export const getRegionalPrices = async (data, config = {}) => {
  try {
    const { baseCurrency, date } = data;
    const response = await axios.get(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${baseCurrency}.json`,
      config
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching regional prices:", error);
    throw error;
  }
};
