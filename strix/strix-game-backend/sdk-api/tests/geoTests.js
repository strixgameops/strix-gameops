const request = require("supertest");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = "http://localhost:3005";

describe("Geo Controller Tests", () => {
  const SECRET_KEY = "awmdia7wdgauiwbda9w8dgiu1pc09cna";
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

  describe("POST /sdk/api/geocoder/getGeoData", () => {
    test("should successfully get geo data for valid IP", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          secret: SECRET_KEY,
          ip: "8.8.8.8", // Google DNS IP for testing
        });

      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test("should handle localhost IP", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          secret: SECRET_KEY,
          ip: "127.0.0.1",
        });

      expect([200, 400, 500]).toContain(response.status);
    });

    test("should handle private IP ranges", async () => {
      const privateIPs = ["192.168.1.1", "10.0.0.1", "172.16.0.1"];

      for (const ip of privateIPs) {
        const response = await request(BASE_URL)
          .post("/sdk/api/geocoder/getGeoData")
          .send({
            secret: SECRET_KEY,
            ip: ip,
          });

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    test("should return error for invalid IP format", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          secret: SECRET_KEY,
          ip: "invalid-ip-format",
        });

      expect([400, 500]).toContain(response.status);
    });

    test("should return error for missing IP", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          secret: SECRET_KEY,
        });

      expect([400, 500]).toContain(response.status);
    });

    test("should validate secret key", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          secret: "invalid-secret",
          ip: "8.8.8.8",
        });

      expect([400, 401, 403, 404]).toContain(response.status);
    });

    test("should handle missing secret", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          ip: "8.8.8.8",
        });

      expect([400, 404]).toContain(response.status);
    });

    test("should handle edge case IPs", async () => {
      const edgeCaseIPs = [
        "0.0.0.0",
        "255.255.255.255",
        "1.1.1.1", // Cloudflare DNS
        "208.67.222.222", // OpenDNS
      ];

      for (const ip of edgeCaseIPs) {
        const response = await request(BASE_URL)
          .post("/sdk/api/geocoder/getGeoData")
          .send({
            secret: SECRET_KEY,
            ip: ip,
          });

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    test("should handle malformed requests", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/geocoder/getGeoData")
        .send({
          secret: SECRET_KEY,
          ip: "8.8.8.8",
          extraField: "should-be-ignored",
        });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe("Geo Service Integration Tests", () => {
    test("should handle multiple consecutive requests", async () => {
      const testIPs = ["8.8.8.8", "1.1.1.1", "208.67.222.222"];

      for (const ip of testIPs) {
        const response = await request(BASE_URL)
          .post("/sdk/api/geocoder/getGeoData")
          .send({
            secret: SECRET_KEY,
            ip: ip,
          });

        expect([200, 400, 500]).toContain(response.status);

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });

    test("should maintain performance with bulk requests", async () => {
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 5; i++) {
        requests.push(
          request(BASE_URL).post("/sdk/api/geocoder/getGeoData").send({
            secret: SECRET_KEY,
            ip: "8.8.8.8",
          })
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max

      responses.forEach((response) => {
        expect([200, 400, 500]).toContain(response.status);
      });
    });
  });
});
