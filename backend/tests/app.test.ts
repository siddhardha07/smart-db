import request from "supertest";
import { Express } from "express";
import { DatabaseConnection } from "../src/db/dbConnection";
import { MultiDatabaseManager } from "../src/db/multiDatabaseManager";

// Mock all dependencies
jest.mock("../src/db/dbConnection");
jest.mock("../src/db/multiDatabaseManager");
jest.mock("../src/routes/schema", () => ({
  __esModule: true,
  default: require("express").Router(),
}));
jest.mock("../src/routes/data", () => ({
  __esModule: true,
  default: require("express").Router(),
}));
jest.mock("../src/routes/database-management", () => ({
  __esModule: true,
  default: require("express").Router(),
}));
jest.mock("../src/routes/query", () => ({
  __esModule: true,
  default: require("express").Router(),
}));

const MockedDatabaseConnection = DatabaseConnection as jest.Mocked<
  typeof DatabaseConnection
>;
const MockedMultiDatabaseManager = MultiDatabaseManager as jest.Mocked<
  typeof MultiDatabaseManager
>;

// Mock console methods to avoid cluttering test output
const consoleSpy = {
  log: jest.spyOn(console, "log").mockImplementation(() => {}),
  error: jest.spyOn(console, "error").mockImplementation(() => {}),
};

describe("App", () => {
  let appInstance: any;
  let expressApp: Express;

  beforeAll(() => {
    // Setup default mocks
    MockedDatabaseConnection.initialize.mockImplementation(() => {});
    MockedDatabaseConnection.testConnection.mockResolvedValue(true);
    MockedDatabaseConnection.close.mockResolvedValue();

    MockedMultiDatabaseManager.initializeLocalDatabase.mockImplementation(
      () => {}
    );
    MockedMultiDatabaseManager.getAvailableDatabases.mockReturnValue([
      {
        id: "test-db",
        credentials: {
          id: "test-db",
          name: "Test Database",
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: "testdb",
          username: "test",
          password: "test",
          isLocal: true,
        },
        createdAt: new Date(),
        lastUsed: new Date(),
      },
    ]);
    MockedMultiDatabaseManager.closeAllConnections.mockResolvedValue();

    // Import app after mocks are set up
    appInstance = require("../src/app").default;
    expressApp = appInstance.getApp();
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("App initialization", () => {
    it("should initialize app successfully", () => {
      expect(appInstance).toBeDefined();
      expect(expressApp).toBeDefined();
      expect(MockedDatabaseConnection.initialize).toHaveBeenCalled();
      expect(
        MockedMultiDatabaseManager.initializeLocalDatabase
      ).toHaveBeenCalled();
    });

    it("should get app instance", () => {
      const app = appInstance.getApp();
      expect(app).toBeDefined();
    });
  });

  describe("Health check endpoint", () => {
    it("should return health status", async () => {
      const response = await request(expressApp).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "healthy",
        service: "SmartDB AI Backend",
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("Root endpoint", () => {
    it("should return API information", async () => {
      const response = await request(expressApp).get("/");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "SmartDB AI Backend API",
        version: "1.0.0",
        endpoints: {
          health: "/health",
          databases: "/api/databases",
          testConnection: "POST /api/databases/test",
          addDatabase: "POST /api/databases",
          schema: "/api/schema",
          data: "/api/data",
          createTables: "POST /api/schema/create-from-mermaid",
          insertData: "POST /api/data/insert",
        },
      });
    });
  });

  describe("404 handler", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(expressApp).get("/unknown-route");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: "Route /unknown-route not found",
      });
    });

    it("should return 404 for unknown POST routes", async () => {
      const response = await request(expressApp).post("/unknown-post-route");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: "Route /unknown-post-route not found",
      });
    });
  });

  describe("Middleware and CORS", () => {
    it("should handle CORS for allowed origins", async () => {
      const response = await request(expressApp)
        .options("/health")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "GET");

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:5173"
      );
    });

    it("should handle JSON requests", async () => {
      const response = await request(expressApp)
        .post("/unknown-json-route")
        .send({ test: "data" })
        .set("Content-Type", "application/json");

      // Should parse JSON without error and return 404 for unknown route
      expect(response.status).toBe(404);
    });

    it("should handle URL encoded requests", async () => {
      const response = await request(expressApp)
        .post("/unknown-form-route")
        .send("test=data")
        .set("Content-Type", "application/x-www-form-urlencoded");

      expect(response.status).toBe(404);
    });
  });

  describe("Request logging middleware", () => {
    it("should log requests", async () => {
      const originalConsoleLog = console.log;
      const logSpy = jest.fn();
      console.log = logSpy;

      await request(expressApp).get("/health");

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - GET \/health/
        )
      );

      console.log = originalConsoleLog;
    });
  });

  describe("Server lifecycle", () => {
    it("should shutdown gracefully", async () => {
      await appInstance.shutdown();

      expect(MockedDatabaseConnection.close).toHaveBeenCalled();
      expect(MockedMultiDatabaseManager.closeAllConnections).toHaveBeenCalled();
    });

    it("should handle shutdown errors", async () => {
      MockedDatabaseConnection.close.mockRejectedValueOnce(
        new Error("Close failed")
      );
      MockedMultiDatabaseManager.closeAllConnections.mockRejectedValueOnce(
        new Error("Close failed")
      );

      await appInstance.shutdown();

      expect(MockedDatabaseConnection.close).toHaveBeenCalled();
      expect(MockedMultiDatabaseManager.closeAllConnections).toHaveBeenCalled();
    });
  });
});
