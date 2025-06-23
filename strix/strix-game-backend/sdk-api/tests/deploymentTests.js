const request = require("supertest");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = "http://localhost:3005";

describe("Deployment Controller Tests", () => {
  const SECRET_KEY = "e76e507f-15f8-0206-e6ac-6d08111e5921";
  let clientID;
  let sessionID;

  beforeEach(() => {
    clientID = uuidv4();
    sessionID = uuidv4();
  });

  describe("POST /sdk/api/deployment/v1/init", () => {
    test("should successfully initialize new player session", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/init")
        .send({
          device: clientID,
          secret: SECRET_KEY,
          session: sessionID,
          environment: "production",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.playerData).toBeDefined();
      expect(response.body.data.currency).toBeDefined();
      expect(response.body.data.fcmData).toBeDefined();
      expect(response.body.data.isNewPlayer).toBeDefined();
    });

    test("should return 400 when secret is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/init")
        .send({
          device: clientID,
          session: sessionID,
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("API key is required");
    });

    test("should return 400 when device is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/init")
        .send({
          secret: SECRET_KEY,
          session: sessionID,
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Device ID is required");
    });

    test("should return 400 when session is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/init")
        .send({
          device: clientID,
          secret: SECRET_KEY,
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Session ID is required");
    });

    test("should return 400 with invalid secret", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/init")
        .send({
          device: clientID,
          secret: "invalid-secret",
          session: sessionID,
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid secret");
    });

    test("should default to production environment", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/init")
        .send({
          device: clientID,
          secret: SECRET_KEY,
          session: sessionID,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /sdk/api/deployment/sdkCheck", () => {
    test("should return SDK version check result", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/sdkCheck")
        .send({
          platform: "Unity",
          engineVersion: "2022.3.0f1",
          sdkVersion: process.env.TARGET_SDK_VERSION || "1.0.0",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.isGood).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should indicate outdated SDK version", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/sdkCheck")
        .send({
          platform: "Unity",
          engineVersion: "2022.3.0f1",
          sdkVersion: "0.5.0",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.isGood).toBe(false);
      expect(response.body.message).toContain("behind current releases");
    });
  });

  describe("POST /sdk/api/deployment/v1/checksumCheckup", () => {
    beforeEach(async () => {
      // Initialize client first
      await request(BASE_URL).post("/sdk/api/deployment/v1/init").send({
        device: clientID,
        secret: SECRET_KEY,
        session: sessionID,
        environment: "production",
      });
    });

    test("should return checksum data for valid request", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/checksumCheckup")
        .send({
          tableNames: ["offers", "segments"],
          secret: SECRET_KEY,
          device: clientID,
          environment: "production",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test("should return 400 when tableNames is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/checksumCheckup")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Missing or wrong table name");
    });
  });

  describe("POST /sdk/api/deployment/v1/clientUpdate", () => {
    beforeEach(async () => {
      await request(BASE_URL).post("/sdk/api/deployment/v1/init").send({
        device: clientID,
        secret: SECRET_KEY,
        session: sessionID,
        environment: "production",
      });
    });

    test("should return client update data", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/clientUpdate")
        .send({
          tableName: "offers",
          secret: SECRET_KEY,
          device: clientID,
          environment: "production",
          itemHashes: {},
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.deletedIds).toBeDefined();
      expect(response.body.data.totalChecksum).toBeDefined();
    });

    test("should return 400 for invalid table name", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/clientUpdate")
        .send({
          tableName: "invalidTable",
          secret: SECRET_KEY,
          device: clientID,
          environment: "production",
          itemHashes: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Missing or wrong table name");
    });
  });

  describe("POST /sdk/api/deployment/v1/regToken", () => {
    beforeEach(async () => {
      await request(BASE_URL).post("/sdk/api/deployment/v1/init").send({
        device: clientID,
        secret: SECRET_KEY,
        session: sessionID,
        environment: "production",
      });
    });

    test("should successfully register FCM token", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/regToken")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          token: "valid-fcm-token-123",
          build: "production",
          environment: "production",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("OK");
    });

    test("should return 400 when token is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/regToken")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          build: "production",
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Missing or wrong token");
    });

    test("should return 400 for stub token", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/regToken")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          token: "StubToken",
          build: "production",
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Missing or wrong token");
    });

    test("should return 400 when build is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/deployment/v1/regToken")
        .send({
          secret: SECRET_KEY,
          device: clientID,
          token: "valid-fcm-token-123",
          environment: "production",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Build type is required");
    });
  });
});
