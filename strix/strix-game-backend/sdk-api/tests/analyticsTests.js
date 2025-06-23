const request = require("supertest");
const { v4: uuidv4 } = require("uuid");
const BASE_URL = "http://localhost:3005";

describe("Analytics Controller Tests", () => {
  const SECRET_KEY = "e76e507f-15f8-0206-e6ac-6d08111e5921";
  let clientID;
  let sessionID;

  beforeEach(async () => {
    // Generate new client and session IDs for each test
    clientID = uuidv4();
    sessionID = uuidv4();

    // Initialize the client first
    const resp = await request(BASE_URL).post("/sdk/api/deployment/v1/init").send({
      device: clientID,
      secret: SECRET_KEY,
      session: sessionID,
      environment: "production",
    });
    console.log(resp)
  });

  describe("POST /sdk/api/analytics/v1/sendEvent", () => {
    const validPayload = [
      {
        type: "newSession",
        time: new Date().toISOString(),
        actions: {},
      },
    ];

    const validRequestBody = {
      device: null, // Will be set in tests
      secret: SECRET_KEY,
      session: null, // Will be set in tests
      language: "en",
      platform: "Unity",
      gameVersion: "1.0.0",
      engineVersion: "2022.3.0f1",
      build: "production",
      time: new Date().toISOString(),
      environment: "production",
      payload: validPayload,
    };

    test("should successfully send analytics event with valid data", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should return 400 when secret is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          secret: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("API key is required");
    });

    test("should return 400 when device ID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          session: sessionID,
          device: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Device ID is required");
    });

    test("should return 400 when session ID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Session ID is required");
    });

    test("should return 400 when payload is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          payload: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Payload is required");
    });

    test("should return 400 when payload is empty array", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          payload: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Payload cannot be 0 length");
    });

    test("should return 400 when language is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          language: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Language is required");
    });

    test("should return 400 when platform is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          platform: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Platform is required");
    });

    test("should return 400 with invalid secret", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          secret: "invalid-secret",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid secret");
    });

    test("should handle different event types", async () => {
      const eventTypes = [
        "endSession",
        "offerEvent",
        "economyEvent",
        "customEvent",
      ];

      for (const eventType of eventTypes) {
        const payload = [
          {
            type: eventType,
            time: new Date().toISOString(),
            actions: eventType === "endSession" ? { sessionLength: 300 } : {},
          },
        ];

        const response = await request(BASE_URL)
          .post("/sdk/api/analytics/v1/sendEvent")
          .send({
            ...validRequestBody,
            device: clientID,
            session: sessionID,
            payload,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test("should handle time correction", async () => {
      const pastTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago

      const response = await request(BASE_URL)
        .post("/sdk/api/analytics/v1/sendEvent")
        .send({
          ...validRequestBody,
          device: clientID,
          session: sessionID,
          time: pastTime,
          payload: [
            {
              type: "testEvent",
              time: pastTime,
              actions: {},
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
