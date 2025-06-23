const request = require("supertest");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = "http://localhost:3005";

describe("Warehouse Controller Tests", () => {
  const SECRET_KEY = "e76e507f-15f8-0206-e6ac-6d08111e5921";
  let clientID;
  let sessionID;

  beforeEach(async () => {
    clientID = uuidv4();
    sessionID = uuidv4();

    // Initialize client first
    await request(BASE_URL).post("/sdk/api/deployment/v1/init").send({
      device: clientID,
      secret: SECRET_KEY,
      session: sessionID,
      environment: "production",
    });
  });

  describe("POST /sdk/api/liveservices/v1/addValueToStatisticElement", () => {
    test("should successfully add value to statistic element", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addValueToStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: 100,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should return 400 when secret is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addValueToStatisticElement")
        .send({
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("API key is required");
    });

    test("should return 400 when elementID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addValueToStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          value: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Target element ID is required");
    });

    test("should return 400 when value is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addValueToStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Target element value is required");
    });
  });

  describe("POST /sdk/api/liveservices/v1/subtractValueFromStatisticElement", () => {
    test("should successfully subtract value from statistic element", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/subtractValueFromStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: 50,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should return 400 with invalid secret", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/subtractValueFromStatisticElement")
        .send({
          secret: "invalid-secret",
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid secret");
    });
  });

  describe("POST /sdk/api/liveservices/v1/setValueToStatisticElement", () => {
    test("should successfully set value to statistic element", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/setValueToStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: 250,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should handle zero value", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/setValueToStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should handle negative value", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/setValueToStatisticElement")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
          value: -100,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /sdk/api/liveservices/v1/getElementValue", () => {
    test("should successfully get element value", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getElementValue")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          elementID: "testElement",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test("should return 400 when device is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getElementValue")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          elementID: "testElement",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Device ID is required");
    });
  });

  describe("POST /sdk/api/liveservices/v1/getLeaderboard", () => {
    test("should successfully get leaderboard", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getLeaderboard")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          leaderboardID: "testLeaderboard",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle leaderboard with grouping", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getLeaderboard")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
          leaderboardID: "testLeaderboard",
          groupID: "country",
          groupValue: "US",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should return 400 when leaderboardID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getLeaderboard")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Target leaderboard ID is required");
    });
  });

  describe("POST /sdk/api/liveservices/v1/setOfferExpiration", () => {
    test("should successfully set offer expiration", async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/setOfferExpiration")
        .send({
          device: clientID,
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          offerID: "testOffer",
          expiration: futureDate,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("OK");
    });

    test("should return 400 when expiration is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/setOfferExpiration")
        .send({
          device: clientID,
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          offerID: "testOffer",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Expiration time is required");
    });

    test("should return 400 when build is missing", async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/setOfferExpiration")
        .send({
          device: clientID,
          secret: SECRET_KEY,
          environment: "production",
          offerID: "testOffer",
          expiration: futureDate,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Build type is required");
    });
  });

  describe("POST /sdk/api/liveservices/v1/backendAction", () => {
    test("should successfully execute segment_add action", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/backendAction")
        .send({
          secret: SECRET_KEY,
          build: "production",
          device: clientID,
          action: "segment_add",
          payload: {
            flowSid: "testFlow",
            nodeSid: "testNode",
            segmentID: "testSegment",
          },
          environment: "production",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should successfully execute segment_remove action", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/backendAction")
        .send({
          secret: SECRET_KEY,
          build: "production",
          device: clientID,
          action: "segment_remove",
          payload: {
            flowSid: "testFlow",
            nodeSid: "testNode",
            segmentID: "testSegment",
          },
          environment: "production",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle unknown action", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/backendAction")
        .send({
          secret: SECRET_KEY,
          build: "production",
          device: clientID,
          action: "unknown_action",
          payload: {},
          environment: "production",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });
});
