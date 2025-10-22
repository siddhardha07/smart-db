import { Pool, PoolClient } from "pg";
import { MultiDatabaseManager } from "../src/db/multiDatabaseManager";
import { DatabaseCredentials, LOCAL_DB_ID } from "../src/types/database";

// Mock pg module
jest.mock("pg", () => ({
  Pool: jest.fn(),
}));

// Mock dotenv
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

const MockedPool = Pool as jest.MockedClass<typeof Pool>;

describe("MultiDatabaseManager", () => {
  let mockPool: any;
  let mockClient: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset static state
    (MultiDatabaseManager as any).connections = new Map();
    (MultiDatabaseManager as any).sessions = new Map();
    (MultiDatabaseManager as any).localPool = null;

    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    };

    // Setup mock pool
    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };

    MockedPool.mockImplementation(() => mockPool);
    mockPool.connect.mockResolvedValue(mockClient);

    // Mock console methods
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.spyOn(console, "log").mockRestore();
  });

  describe("initializeLocalDatabase", () => {
    it("should initialize local database successfully", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "5432";
      process.env.DB_NAME = "testdb";
      process.env.DB_USER = "testuser";
      process.env.DB_PASSWORD = "testpass";

      MultiDatabaseManager.initializeLocalDatabase();

      expect(MockedPool).toHaveBeenCalledWith({
        host: "localhost",
        port: 5432,
        database: "testdb",
        user: "testuser",
        password: "testpass",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      expect(mockPool.on).toHaveBeenCalledWith("error", expect.any(Function));

      // Test that it doesn't reinitialize
      MockedPool.mockClear();
      MultiDatabaseManager.initializeLocalDatabase();
      expect(MockedPool).not.toHaveBeenCalled();
    });

    it("should use default environment variables", () => {
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;

      MultiDatabaseManager.initializeLocalDatabase();

      expect(MockedPool).toHaveBeenCalledWith({
        host: "localhost",
        port: 5432,
        database: "smartdb",
        user: "postgres",
        password: "password",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });

    it("should handle pool errors", () => {
      MultiDatabaseManager.initializeLocalDatabase();

      const errorHandler = mockPool.on.mock.calls[0][1];
      const testError = new Error("Pool error");

      errorHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unexpected error on local database client",
        testError
      );
    });
  });

  describe("testConnection", () => {
    const testCredentials: DatabaseCredentials = {
      id: "test-db",
      name: "Test Database",
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "testdb",
      username: "testuser",
      password: "testpass",
    };

    it("should test connection successfully", async () => {
      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });

      const result = await MultiDatabaseManager.testConnection(testCredentials);

      expect(MockedPool).toHaveBeenCalledWith({
        host: "localhost",
        port: 5432,
        database: "testdb",
        user: "testuser",
        password: "testpass",
        max: 1,
        connectionTimeoutMillis: 5000,
      });

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("SELECT 1");
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockPool.end).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        message: "Successfully connected to testdb",
        connectionId: "test-db",
      });
    });

    it("should handle connection failure", async () => {
      const connectionError = new Error("Connection failed");
      mockPool.connect.mockRejectedValue(connectionError);

      const result = await MultiDatabaseManager.testConnection(testCredentials);

      expect(result).toEqual({
        success: false,
        message: "Connection failed",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Connection test failed:",
        connectionError
      );
      expect(mockPool.end).toHaveBeenCalled();
    });

    it("should handle query failure", async () => {
      const queryError = new Error("Query failed");
      mockClient.query.mockRejectedValue(queryError);

      const result = await MultiDatabaseManager.testConnection(testCredentials);

      expect(result).toEqual({
        success: false,
        message: "Query failed",
      });

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe("addConnection", () => {
    const testCredentials: DatabaseCredentials = {
      id: "new-db",
      name: "New Database",
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "newdb",
      username: "user",
      password: "pass",
    };

    it("should add connection successfully", async () => {
      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });

      const result = await MultiDatabaseManager.addConnection(testCredentials);

      expect(result).toEqual({
        success: true,
        message: "Connected to New Database",
        connectionId: "new-db",
      });

      const sessions = MultiDatabaseManager.getAvailableDatabases();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe("new-db");
      expect(sessions[0].credentials).toEqual(testCredentials);
    });

    it("should handle connection failure during add", async () => {
      const connectionError = new Error("Connection failed");
      mockPool.connect.mockRejectedValue(connectionError);

      const result = await MultiDatabaseManager.addConnection(testCredentials);

      expect(result).toEqual({
        success: false,
        message: "Connection failed",
      });
    });
  });

  describe("getClient", () => {
    it("should get client from local database", async () => {
      MultiDatabaseManager.initializeLocalDatabase();

      const client = await MultiDatabaseManager.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it("should get client from specific database", async () => {
      // Setup a test connection
      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      const client = await MultiDatabaseManager.getClient("test-db");

      expect(client).toBe(mockClient);
    });

    it("should throw error for unknown connection", async () => {
      await expect(
        MultiDatabaseManager.getClient("unknown-db")
      ).rejects.toThrow("Database connection 'unknown-db' not found");
    });

    it("should update last used timestamp", async () => {
      MultiDatabaseManager.initializeLocalDatabase();
      const beforeTime = Date.now();

      await MultiDatabaseManager.getClient();

      const sessions = MultiDatabaseManager.getAvailableDatabases();
      const localSession = sessions.find((s) => s.id === LOCAL_DB_ID);
      expect(localSession).toBeDefined();
      expect(localSession!.lastUsed.getTime()).toBeGreaterThanOrEqual(
        beforeTime
      );
    });
  });

  describe("query", () => {
    it("should execute query on local database", async () => {
      MultiDatabaseManager.initializeLocalDatabase();
      const queryResult = { rows: [{ id: 1, name: "test" }] };
      mockClient.query.mockResolvedValue(queryResult);

      const result = await MultiDatabaseManager.query("SELECT * FROM users", [
        "param1",
      ]);

      expect(mockClient.query).toHaveBeenCalledWith("SELECT * FROM users", [
        "param1",
      ]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe(queryResult);
    });

    it("should execute query on specific database", async () => {
      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      const queryResult = { rows: [{ count: 5 }] };
      mockClient.query.mockResolvedValue(queryResult);

      const result = await MultiDatabaseManager.query(
        "SELECT COUNT(*) FROM table",
        [],
        "test-db"
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT COUNT(*) FROM table",
        []
      );
      expect(result).toBe(queryResult);
    });

    it("should handle query errors", async () => {
      MultiDatabaseManager.initializeLocalDatabase();
      const queryError = new Error("Query failed");
      mockClient.query.mockRejectedValue(queryError);

      await expect(MultiDatabaseManager.query("INVALID SQL")).rejects.toThrow(
        "Query failed"
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("getAvailableDatabases", () => {
    it("should return empty array when no databases", () => {
      const databases = MultiDatabaseManager.getAvailableDatabases();
      expect(databases).toEqual([]);
    });

    it("should return local database after initialization", () => {
      MultiDatabaseManager.initializeLocalDatabase();

      const databases = MultiDatabaseManager.getAvailableDatabases();
      expect(databases).toHaveLength(1);
      expect(databases[0].id).toBe(LOCAL_DB_ID);
      expect(databases[0].credentials.name).toBe("pg-db (Local)");
      expect(databases[0].credentials.isLocal).toBe(true);
    });

    it("should return multiple databases", async () => {
      MultiDatabaseManager.initializeLocalDatabase();

      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      const databases = MultiDatabaseManager.getAvailableDatabases();
      expect(databases).toHaveLength(2);
      expect(databases.map((db) => db.id)).toContain(LOCAL_DB_ID);
      expect(databases.map((db) => db.id)).toContain("test-db");
    });
  });

  describe("removeConnection", () => {
    it("should remove connection successfully", async () => {
      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      expect(MultiDatabaseManager.getAvailableDatabases()).toHaveLength(1);

      const result = await MultiDatabaseManager.removeConnection("test-db");

      expect(result).toBe(true);
      expect(MultiDatabaseManager.getAvailableDatabases()).toHaveLength(0);
      expect(mockPool.end).toHaveBeenCalled();
    });

    it("should return false for non-existent connection", async () => {
      const result = await MultiDatabaseManager.removeConnection(
        "non-existent"
      );
      expect(result).toBe(false);
    });

    it("should prevent removal of local database", async () => {
      MultiDatabaseManager.initializeLocalDatabase();

      await expect(
        MultiDatabaseManager.removeConnection(LOCAL_DB_ID)
      ).rejects.toThrow("Cannot remove local database connection");

      expect(MultiDatabaseManager.getAvailableDatabases()).toHaveLength(1);
    });

    it("should handle pool close errors", async () => {
      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      const closeError = new Error("Close failed");
      mockPool.end.mockRejectedValue(closeError);

      const result = await MultiDatabaseManager.removeConnection("test-db");

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error removing connection test-db:",
        closeError
      );
    });
  });

  describe("closeAllConnections", () => {
    it("should close all connections", async () => {
      MultiDatabaseManager.initializeLocalDatabase();

      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      expect(MultiDatabaseManager.getAvailableDatabases()).toHaveLength(2);

      await MultiDatabaseManager.closeAllConnections();

      expect(MultiDatabaseManager.getAvailableDatabases()).toHaveLength(0);
      expect(mockPool.end).toHaveBeenCalledTimes(3); // Called for test connection, local, and actual connection
    });

    it("should handle close errors", async () => {
      MultiDatabaseManager.initializeLocalDatabase();

      const closeError = new Error("Close failed");
      mockPool.end.mockRejectedValue(closeError);

      await MultiDatabaseManager.closeAllConnections();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error closing connection pg-db:",
        closeError
      );
    });
  });

  describe("tableExists", () => {
    it("should return true when table exists", async () => {
      MultiDatabaseManager.initializeLocalDatabase();
      mockClient.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await MultiDatabaseManager.tableExists("users");

      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        ["users"]
      );
      expect(result).toBe(true);
    });

    it("should return false when table doesn't exist", async () => {
      MultiDatabaseManager.initializeLocalDatabase();
      mockClient.query.mockResolvedValue({ rows: [{ exists: false }] });

      const result = await MultiDatabaseManager.tableExists("nonexistent");

      expect(result).toBe(false);
    });

    it("should check table in specific database", async () => {
      const testCredentials: DatabaseCredentials = {
        id: "test-db",
        name: "Test Database",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "user",
        password: "pass",
      };

      mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      await MultiDatabaseManager.addConnection(testCredentials);

      mockClient.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await MultiDatabaseManager.tableExists(
        "products",
        "test-db"
      );

      expect(mockClient.query).toHaveBeenLastCalledWith(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        ["products"]
      );
      expect(result).toBe(true);
    });

    it("should handle query errors", async () => {
      MultiDatabaseManager.initializeLocalDatabase();
      const queryError = new Error("Query failed");
      mockClient.query.mockRejectedValue(queryError);

      const result = await MultiDatabaseManager.tableExists("users");

      expect(result).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
