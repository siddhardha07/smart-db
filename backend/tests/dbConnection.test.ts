import { DatabaseConnection } from "../src/db/dbConnection";

// Create mock objects
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

// Mock the pg module
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));

// Mock dotenv
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("DatabaseConnection", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset the DatabaseConnection static state
    (DatabaseConnection as any).pool = null;
  });

  afterEach(async () => {
    // Clean up after each test
    await DatabaseConnection.close();
  });

  describe("initialize", () => {
    test("initializes database pool with default values", () => {
      const { Pool } = require("pg");
      
      DatabaseConnection.initialize();

      expect(Pool).toHaveBeenCalledWith({
        host: "localhost",
        port: 5432,
        database: "smartdb",
        user: "postgres",
        password: "password",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      expect(mockPool.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    test("uses environment variables when available", () => {
      const { Pool } = require("pg");
      
      // Set environment variables
      process.env.DB_HOST = "testhost";
      process.env.DB_PORT = "5433";
      process.env.DB_NAME = "testdb";
      process.env.DB_USER = "testuser";
      process.env.DB_PASSWORD = "testpass";

      DatabaseConnection.initialize();

      expect(Pool).toHaveBeenCalledWith({
        host: "testhost",
        port: 5433,
        database: "testdb",
        user: "testuser",
        password: "testpass",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Clean up environment variables
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
    });

    test("does not reinitialize if already initialized", () => {
      const { Pool } = require("pg");
      
      DatabaseConnection.initialize();
      DatabaseConnection.initialize();

      expect(Pool).toHaveBeenCalledTimes(1);
    });
  });

  describe("getClient", () => {
    test("throws error if not initialized", async () => {
      await expect(DatabaseConnection.getClient()).rejects.toThrow(
        "Database not initialized. Call initialize() first."
      );
    });

    test("returns client from pool when initialized", async () => {
      DatabaseConnection.initialize();
      
      const client = await DatabaseConnection.getClient();
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    test("throws error when pool connection fails", async () => {
      DatabaseConnection.initialize();
      mockPool.connect.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(DatabaseConnection.getClient()).rejects.toThrow(
        "Failed to connect to database: Connection failed"
      );
    });

    test("handles non-Error objects in connection failure", async () => {
      DatabaseConnection.initialize();
      mockPool.connect.mockRejectedValueOnce("String error");

      await expect(DatabaseConnection.getClient()).rejects.toThrow(
        "Failed to connect to database: Unknown error"
      );
    });
  });

  describe("query", () => {
    beforeEach(() => {
      DatabaseConnection.initialize();
    });

    test("executes query with parameters and releases client", async () => {
      const mockResult = { rows: [{ id: 1, name: "test" }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await DatabaseConnection.query("SELECT * FROM test WHERE id = $1", [1]);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("SELECT * FROM test WHERE id = $1", [1]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    test("executes query without parameters", async () => {
      const mockResult = { rows: [{ now: "2023-01-01" }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await DatabaseConnection.query("SELECT NOW()");

      expect(mockClient.query).toHaveBeenCalledWith("SELECT NOW()", undefined);
      expect(result).toEqual(mockResult);
    });

    test("releases client even when query fails", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(DatabaseConnection.query("INVALID SQL")).rejects.toThrow("Query failed");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("testConnection", () => {
    beforeEach(() => {
      DatabaseConnection.initialize();
    });

    test("returns true when connection test succeeds", async () => {
      const mockResult = { rows: [{ current_time: "2023-01-01T12:00:00Z" }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = await DatabaseConnection.testConnection();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith("SELECT NOW() as current_time", undefined);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Database connection test successful:",
        "2023-01-01T12:00:00Z"
      );

      consoleSpy.mockRestore();
    });

    test("returns false when connection test fails", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Connection failed"));

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await DatabaseConnection.testConnection();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database connection test failed:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("close", () => {
    test("closes pool when initialized", async () => {
      DatabaseConnection.initialize();
      
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await DatabaseConnection.close();

      expect(mockPool.end).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Database connection pool closed");

      consoleSpy.mockRestore();
    });

    test("does nothing when pool is not initialized", async () => {
      await DatabaseConnection.close();

      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });

  describe("tableExists", () => {
    beforeEach(() => {
      DatabaseConnection.initialize();
    });

    test("returns true when table exists", async () => {
      const mockResult = { rows: [{ exists: true }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await DatabaseConnection.tableExists("users");

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT EXISTS"),
        ["users"]
      );
    });

    test("returns false when table does not exist", async () => {
      const mockResult = { rows: [{ exists: false }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await DatabaseConnection.tableExists("nonexistent");

      expect(result).toBe(false);
    });

    test("converts table name to lowercase", async () => {
      const mockResult = { rows: [{ exists: true }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      await DatabaseConnection.tableExists("USERS");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT EXISTS"),
        ["users"]
      );
    });

    test("returns false when query fails", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await DatabaseConnection.tableExists("users");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error checking if table users exists:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test("handles missing exists property in result", async () => {
      const mockResult = { rows: [{}] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await DatabaseConnection.tableExists("users");

      expect(result).toBe(false);
    });
  });

  describe("dropTableIfExists", () => {
    beforeEach(() => {
      DatabaseConnection.initialize();
    });

    test("drops table successfully", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await DatabaseConnection.dropTableIfExists("users");

      expect(mockClient.query).toHaveBeenCalledWith('DROP TABLE IF EXISTS "users" CASCADE', undefined);
      expect(consoleSpy).toHaveBeenCalledWith("Table users dropped (if it existed)");

      consoleSpy.mockRestore();
    });

    test("throws error when drop fails", async () => {
      const error = new Error("Drop failed");
      mockClient.query.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(DatabaseConnection.dropTableIfExists("users")).rejects.toThrow("Drop failed");
      
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error dropping table users:", error);

      consoleErrorSpy.mockRestore();
    });
  });
});