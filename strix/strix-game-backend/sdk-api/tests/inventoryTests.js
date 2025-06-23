const request = require("supertest");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = "http://localhost:3005";
const nodeID = "c03ed585-46b6-4ad5-aef9-36cc76da9d6d"; // brawlDemo "Gems"
describe("Inventory Controller Tests", () => {
  const SECRET_KEY = "e76e507f-15f8-0206-e6ac-6d08111e5921";
  let clientID;
  let sessionID;

  beforeEach(async () => {
    clientID = uuidv4();
    sessionID = uuidv4();

    console.log("Registering player", clientID)

    // Initialize client first
    await request(BASE_URL).post("/sdk/api/deployment/v1/init").send({
      device: clientID,
      secret: SECRET_KEY,
      session: sessionID,
      environment: "production",
    });
  });

  describe("POST /sdk/api/liveservices/v1/getInventoryItems", () => {
    test("should successfully get inventory items", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItems")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should return 400 when secret is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItems")
        .send({
          build: "production",
          environment: "production",
          device: clientID,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid secret");
    });

    test("should return 400 with invalid secret", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItems")
        .send({
          secret: "invalid-secret",
          build: "production",
          environment: "production",
          device: clientID,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid secret");
    });
  });

  describe("POST /sdk/api/liveservices/v1/getInventoryItemAmount", () => {
    test("should successfully get inventory item amount", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItemAmount")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test("should get inventory item amount for specific slot", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItemAmount")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          slot: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test("should return 400 when nodeID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItemAmount")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /sdk/api/liveservices/v1/addInventoryItem", () => {
    test("should successfully add inventory item", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should successfully add inventory item to specific slot", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 5,
          slot: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle large amounts", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 999999999,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle zero amount", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should return 400 when amount is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should return 400 when nodeID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          amount: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /sdk/api/liveservices/v1/removeInventoryItem", () => {
    // First add some items before removing them
    beforeEach(async () => {
      await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 100,
        });
    });

    test("should successfully remove inventory item", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should successfully remove inventory item from specific slot", async () => {
      // First add item to specific slot
      await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: "slotItem",
          amount: 50,
          slot: 1,
        });

      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: "slotItem",
          amount: 25,
          slot: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle removing more than available", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 200,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle removing zero amount", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
          amount: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should handle removing from non-existent item", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: "nonExistentItem",
          amount: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });

    test("should return 400 when amount is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should return 400 when nodeID is missing", async () => {
      const response = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          amount: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Inventory Integration Tests", () => {
    test("should maintain consistency across add/get/remove operations", async () => {
      
      const initialAmount = 50;
      const addAmount = 30;
      const removeAmount = 20;

      // Add initial amount
      const resp1 = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: nodeID,
          amount: initialAmount,
        });

      console.log("Inventory resp1:", resp1.body);

      // Get initial amount
      let getResponse = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItemAmount")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: nodeID,
        });

      console.log("Inventory resp2:", getResponse.body);

      expect(parseInt(getResponse.body.data)).toBe(initialAmount);

      // Add more
      const resp3 = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/addInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: nodeID,
          amount: addAmount,
        });

      console.log("Inventory resp3:", resp3.body);

      // Check updated amount
      getResponse = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItemAmount")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: nodeID,
        });
      console.log("Inventory resp4:", resp3.body);

      expect(parseInt(getResponse.body.data)).toBe(initialAmount + addAmount);

      // Remove some
      const resp5 = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/removeInventoryItem")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: nodeID,
          amount: removeAmount,
        });

      console.log("Inventory resp5:", resp5.body);

      // Check final amount
      getResponse = await request(BASE_URL)
        .post("/sdk/api/liveservices/v1/getInventoryItemAmount")
        .send({
          secret: SECRET_KEY,
          build: "production",
          environment: "production",
          device: clientID,
          nodeID: nodeID,
        });
      console.log("Inventory resp6:", getResponse.body);

      expect(parseInt(getResponse.body.data)).toBe(
        initialAmount + addAmount - removeAmount
      );
    });
  });
});
