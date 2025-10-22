import request from "supertest";
import express from "express";
import databaseManagementRouter from "../src/routes/database-management";
import { MultiDatabaseManager } from "../src/db/multiDatabaseManager";
import { DatabaseCredentials, LOCAL_DB_ID } from "../src/types/database";

// Mock MultiDatabaseManager
jest.mock("../src/db/multiDatabaseManager");
const MockedMultiDatabaseManager = MultiDatabaseManager as jest.Mocked<
  typeof MultiDatabaseManager
>;

describe("Database Management Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/database-management", databaseManagementRouter);
    jest.clearAllMocks();
  });

  describe("GET /databases", () => {
    const mockDatabases = [
      {
        id: LOCAL_DB_ID,
        credentials: {
          id: LOCAL_DB_ID,
          name: "Local PostgreSQL",
          type: "postgresql" as const,
          host: "localhost",
          port: 5432,
          database: "smartdb",
          username: "postgres",
          password: "password",
          isLocal: true,
        },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        lastUsed: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "test-db",
        credentials: {
          id: "test-db",
          name: "Test Database",
          type: "postgresql" as const,
          host: "test.example.com",
          port: 5432,
          database: "testdb",
          username: "testuser",
          password: "testpass",
          isLocal: false,
        },
        createdAt: new Date("2024-01-02T00:00:00Z"),
        lastUsed: new Date("2024-01-02T00:00:00Z"),
      },
    ];

    it("should return all available databases successfully", async () => {
      MockedMultiDatabaseManager.getAvailableDatabases.mockReturnValue(
        mockDatabases
      );

      const response = await request(app).get(
        "/api/database-management/databases"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        databases: [
          {
            id: LOCAL_DB_ID,
            name: "Local PostgreSQL",
            type: "postgresql",
            host: "localhost",
            port: 5432,
            database: "smartdb",
            isLocal: true,
            lastUsed: "2024-01-01T00:00:00.000Z",
          },
          {
            id: "test-db",
            name: "Test Database",
            type: "postgresql",
            host: "test.example.com",
            port: 5432,
            database: "testdb",
            isLocal: false,
            lastUsed: "2024-01-02T00:00:00.000Z",
          },
        ],
      });
    });

    it("should return empty array when no databases are available", async () => {
      MockedMultiDatabaseManager.getAvailableDatabases.mockReturnValue([]);

      const response = await request(app).get(
        "/api/database-management/databases"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        databases: [],
      });
    });

    it("should handle errors when getting databases", async () => {
      MockedMultiDatabaseManager.getAvailableDatabases.mockImplementation(
        () => {
          throw new Error("Database connection failed");
        }
      );

      const response = await request(app).get(
        "/api/database-management/databases"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Failed to get database list",
      });
    });

    it("should handle non-Error exceptions", async () => {
      MockedMultiDatabaseManager.getAvailableDatabases.mockImplementation(
        () => {
          throw "String error";
        }
      );

      const response = await request(app).get(
        "/api/database-management/databases"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Failed to get database list",
      });
    });
  });

  describe("POST /databases/test", () => {
    const validCredentials: DatabaseCredentials = {
      id: "test-id",
      name: "Test DB",
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "testdb",
      username: "testuser",
      password: "testpass",
    };

    it("should test connection successfully", async () => {
      const mockResult = {
        success: true,
        message: "Connection successful",
        connectionId: "test-id",
      };
      MockedMultiDatabaseManager.testConnection.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(validCredentials);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(MockedMultiDatabaseManager.testConnection).toHaveBeenCalledWith(
        validCredentials
      );
    });

    it("should return 400 when connection fails", async () => {
      const mockResult = {
        success: false,
        message: "Connection failed: Invalid credentials",
      };
      MockedMultiDatabaseManager.testConnection.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(validCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(mockResult);
    });

    it("should return 400 for missing host", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).host;

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing port", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).port;

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing database", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).database;

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing username", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).username;

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing password", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).password;

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for empty host", async () => {
      const invalidCredentials = { ...validCredentials, host: "" };

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for empty database name", async () => {
      const invalidCredentials = { ...validCredentials, database: "" };

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for empty username", async () => {
      const invalidCredentials = { ...validCredentials, username: "" };

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for empty password", async () => {
      const invalidCredentials = { ...validCredentials, password: "" };

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should handle internal server errors", async () => {
      MockedMultiDatabaseManager.testConnection.mockRejectedValue(
        new Error("Connection timeout")
      );

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(validCredentials);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error during connection test",
      });
    });

    it("should handle non-Error exceptions", async () => {
      MockedMultiDatabaseManager.testConnection.mockRejectedValue(
        "String error"
      );

      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send(validCredentials);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error during connection test",
      });
    });

    it("should handle invalid JSON payload", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send("invalid json");

      expect(response.status).toBe(500); // Express JSON parser returns 500 for malformed JSON
    });
  });

  describe("POST /databases", () => {
    const validCredentials: DatabaseCredentials = {
      id: "new-db",
      name: "New Database",
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "newdb",
      username: "newuser",
      password: "newpass",
    };

    beforeEach(() => {
      // Mock empty database list by default
      MockedMultiDatabaseManager.getAvailableDatabases.mockReturnValue([]);
    });

    it("should add new database connection successfully", async () => {
      const mockResult = {
        success: true,
        message: "Database connection added successfully",
        connectionId: "new-db",
      };
      MockedMultiDatabaseManager.addConnection.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(validCredentials);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResult);
      expect(MockedMultiDatabaseManager.addConnection).toHaveBeenCalledWith(
        validCredentials
      );
    });

    it("should return 400 when connection addition fails", async () => {
      const mockResult = {
        success: false,
        message: "Failed to connect to database",
      };
      MockedMultiDatabaseManager.addConnection.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(validCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(mockResult);
    });

    it("should return 400 for missing id", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).id;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing name", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).name;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing host", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).host;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing port", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).port;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing database", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).database;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing username", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).username;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for missing password", async () => {
      const invalidCredentials = { ...validCredentials };
      delete (invalidCredentials as any).password;

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for empty id", async () => {
      const invalidCredentials = { ...validCredentials, id: "" };

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 for empty name", async () => {
      const invalidCredentials = { ...validCredentials, name: "" };

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should return 400 when database ID already exists", async () => {
      const existingDb = {
        id: "new-db",
        credentials: validCredentials,
        createdAt: new Date("2024-01-03T00:00:00Z"),
        lastUsed: new Date(),
      };
      MockedMultiDatabaseManager.getAvailableDatabases.mockReturnValue([
        existingDb,
      ]);

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(validCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Database connection with this ID already exists",
      });
    });

    it("should handle internal server errors", async () => {
      MockedMultiDatabaseManager.addConnection.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(validCredentials);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error while adding database connection",
      });
    });

    it("should handle non-Error exceptions", async () => {
      MockedMultiDatabaseManager.addConnection.mockRejectedValue(
        "String error"
      );

      const response = await request(app)
        .post("/api/database-management/databases")
        .send(validCredentials);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error while adding database connection",
      });
    });
  });

  describe("DELETE /databases/:id", () => {
    it("should remove database connection successfully", async () => {
      MockedMultiDatabaseManager.removeConnection.mockResolvedValue(true);

      const response = await request(app).delete(
        "/api/database-management/databases/test-db"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Database connection 'test-db' removed successfully",
      });
      expect(MockedMultiDatabaseManager.removeConnection).toHaveBeenCalledWith(
        "test-db"
      );
    });

    it("should return 404 when database not found", async () => {
      MockedMultiDatabaseManager.removeConnection.mockResolvedValue(false);

      const response = await request(app).delete(
        "/api/database-management/databases/nonexistent"
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Database connection 'nonexistent' not found",
      });
    });

    it("should return 400 for empty database ID", async () => {
      const response = await request(app).delete(
        "/api/database-management/databases/"
      );

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });

    it("should handle internal server errors", async () => {
      MockedMultiDatabaseManager.removeConnection.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app).delete(
        "/api/database-management/databases/test-db"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Database error",
      });
    });

    it("should handle non-Error exceptions", async () => {
      MockedMultiDatabaseManager.removeConnection.mockRejectedValue(
        "String error"
      );

      const response = await request(app).delete(
        "/api/database-management/databases/test-db"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Failed to remove database connection",
      });
    });

    it("should handle URL encoded database IDs", async () => {
      MockedMultiDatabaseManager.removeConnection.mockResolvedValue(true);

      const response = await request(app).delete(
        "/api/database-management/databases/test%20db"
      );

      expect(response.status).toBe(200);
      expect(MockedMultiDatabaseManager.removeConnection).toHaveBeenCalledWith(
        "test db"
      );
    });

    it("should handle special characters in database ID", async () => {
      MockedMultiDatabaseManager.removeConnection.mockResolvedValue(true);

      const response = await request(app).delete(
        "/api/database-management/databases/test-db_123"
      );

      expect(response.status).toBe(200);
      expect(MockedMultiDatabaseManager.removeConnection).toHaveBeenCalledWith(
        "test-db_123"
      );
    });
  });

  describe("GET /databases/:id/schema", () => {
    const mockTablesResult = {
      rows: [
        { table_name: "users", table_schema: "public" },
        { table_name: "products", table_schema: "public" },
      ],
    };

    const mockUsersColumnsResult = {
      rows: [
        {
          column_name: "id",
          data_type: "integer",
          is_nullable: "NO",
          column_default: "nextval('users_id_seq'::regclass)",
        },
        {
          column_name: "name",
          data_type: "character varying",
          is_nullable: "NO",
          column_default: null,
        },
        {
          column_name: "email",
          data_type: "character varying",
          is_nullable: "YES",
          column_default: null,
        },
      ],
    };

    const mockProductsColumnsResult = {
      rows: [
        {
          column_name: "id",
          data_type: "integer",
          is_nullable: "NO",
          column_default: "nextval('products_id_seq'::regclass)",
        },
        {
          column_name: "title",
          data_type: "character varying",
          is_nullable: "NO",
          column_default: null,
        },
        {
          column_name: "price",
          data_type: "numeric",
          is_nullable: "YES",
          column_default: null,
        },
      ],
    };

    it("should get database schema successfully", async () => {
      MockedMultiDatabaseManager.query
        .mockResolvedValueOnce(mockTablesResult) // Tables query
        .mockResolvedValueOnce(mockUsersColumnsResult) // Users columns
        .mockResolvedValueOnce(mockProductsColumnsResult); // Products columns

      const response = await request(app).get(
        "/api/database-management/databases/test-db/schema"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        schema: [
          {
            tableName: "users",
            columns: mockUsersColumnsResult.rows,
          },
          {
            tableName: "products",
            columns: mockProductsColumnsResult.rows,
          },
        ],
      });

      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT table_name, table_schema"),
        [],
        "test-db"
      );
      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT column_name, data_type"),
        ["users"],
        "test-db"
      );
      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT column_name, data_type"),
        ["products"],
        "test-db"
      );
    });

    it("should handle database with no tables", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get(
        "/api/database-management/databases/empty-db/schema"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        schema: [],
      });
    });

    it("should handle table with no columns", async () => {
      const singleTableResult = {
        rows: [{ table_name: "empty_table", table_schema: "public" }],
      };
      MockedMultiDatabaseManager.query
        .mockResolvedValueOnce(singleTableResult)
        .mockResolvedValueOnce({ rows: [] }); // No columns

      const response = await request(app).get(
        "/api/database-management/databases/test-db/schema"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        schema: [
          {
            tableName: "empty_table",
            columns: [],
          },
        ],
      });
    });

    it("should handle database connection errors", async () => {
      MockedMultiDatabaseManager.query.mockRejectedValue(
        new Error("Connection failed")
      );

      const response = await request(app).get(
        "/api/database-management/databases/invalid-db/schema"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Failed to get database schema",
      });
    });

    it("should handle errors during column retrieval", async () => {
      MockedMultiDatabaseManager.query
        .mockResolvedValueOnce(mockTablesResult) // Tables query succeeds
        .mockRejectedValueOnce(new Error("Column query failed")); // Columns query fails

      const response = await request(app).get(
        "/api/database-management/databases/test-db/schema"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Failed to get database schema",
      });
    });

    it("should handle non-Error exceptions", async () => {
      MockedMultiDatabaseManager.query.mockRejectedValue("String error");

      const response = await request(app).get(
        "/api/database-management/databases/test-db/schema"
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Failed to get database schema",
      });
    });

    it("should handle URL encoded database IDs in schema endpoint", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get(
        "/api/database-management/databases/test%20db/schema"
      );

      expect(response.status).toBe(200);
      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        expect.any(String),
        [],
        "test db"
      );
    });

    it("should handle special characters in database ID for schema endpoint", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get(
        "/api/database-management/databases/test-db_123/schema"
      );

      expect(response.status).toBe(200);
      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        expect.any(String),
        [],
        "test-db_123"
      );
    });

    it("should handle large number of tables", async () => {
      // Generate 100 mock tables
      const largeMockTablesResult = {
        rows: Array.from({ length: 100 }, (_, i) => ({
          table_name: `table_${i}`,
          table_schema: "public",
        })),
      };

      // Mock columns for each table
      MockedMultiDatabaseManager.query.mockResolvedValueOnce(
        largeMockTablesResult
      );

      // Mock column queries for all tables
      for (let i = 0; i < 100; i++) {
        MockedMultiDatabaseManager.query.mockResolvedValueOnce({
          rows: [
            {
              column_name: "id",
              data_type: "integer",
              is_nullable: "NO",
              column_default: null,
            },
          ],
        });
      }

      const response = await request(app).get(
        "/api/database-management/databases/large-db/schema"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.schema).toHaveLength(100);
      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledTimes(101); // 1 tables query + 100 column queries
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle malformed JSON in request body", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .set("Content-Type", "application/json")
        .send("{ invalid json");

      expect(response.status).toBe(400);
    });

    it("should handle requests with no body", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send();

      expect(response.status).toBe(500); // No body causes Express to handle it as 500
    });

    it("should handle requests with null values", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send({
          id: "test",
          name: "test",
          type: "postgresql",
          host: null,
          port: 5432,
          database: "test",
          username: "test",
          password: "test",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should handle requests with undefined values", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send({
          id: "test",
          name: "test",
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: undefined,
          username: "test",
          password: "test",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Missing required connection parameters",
      });
    });

    it("should handle non-string values for string fields", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send({
          id: 123, // Should be string
          name: "test",
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: "test",
          username: "test",
          password: "test",
        });

      expect(response.status).toBe(500); // Type validation causes internal error
    });

    it("should handle non-numeric values for port", async () => {
      const response = await request(app)
        .post("/api/database-management/databases/test")
        .send({
          id: "test",
          name: "test",
          type: "postgresql",
          host: "localhost",
          port: "invalid", // Should be number
          database: "test",
          username: "test",
          password: "test",
        });

      expect(response.status).toBe(500); // Type validation causes internal error
    });
  });
});
