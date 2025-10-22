import request from "supertest";
import express, { Express } from "express";
import router from "../src/routes/data"; // adjust import path
import { MultiDatabaseManager } from "../src/db/multiDatabaseManager";

// Mock MultiDatabaseManager
jest.mock("../src/db/multiDatabaseManager", () => ({
  MultiDatabaseManager: {
    query: jest.fn(),
  },
}));

const mockQuery = MultiDatabaseManager.query as jest.Mock;

// Create test server
let app: Express;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api/data", router);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/data/insert", () => {
  it("should use LOCAL_DB_ID when databaseId is missing", async () => {
    // Connection check should use LOCAL_DB_ID (pg-db)
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // SELECT 1

    const response = await request(app)
      .post("/api/data/insert")
      .send({ data: {} }); // No databaseId provided

    expect(mockQuery).toHaveBeenCalledWith("SELECT 1", [], "pg-db");
    expect(response.status).toBe(200); // Should not return 400
  });

  it("should return 400 if databaseId is invalid type", async () => {
    const response = await request(app)
      .post("/api/data/insert")
      .send({ databaseId: 123, data: {} }); // Invalid type

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Missing or invalid database ID",
    });
  });

  it("should return 400 if data is missing or invalid", async () => {
    const response = await request(app)
      .post("/api/data/insert")
      .send({ databaseId: "test_db" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Missing or invalid data object",
    });
  });

  it("should return 400 if database connection fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection failed"));

    const response = await request(app)
      .post("/api/data/insert")
      .send({ databaseId: "test_db", data: { users: [] } });

    expect(mockQuery).toHaveBeenCalledWith("SELECT 1", [], "test_db");
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Cannot connect to database");
  });

  it("should handle non-existent table gracefully", async () => {
    // Connection works
    mockQuery
      .mockResolvedValueOnce({ rows: [{}] }) // for SELECT 1
      .mockResolvedValueOnce({ rows: [] }); // no columns found for table

    const response = await request(app)
      .post("/api/data/insert")
      .send({
        databaseId: "test_db",
        data: { unknown_table: [{ name: "Siddu" }] },
      });

    expect(response.status).toBe(200);
    expect(response.body.details[0].errors[0]).toContain(
      'Table "unknown_table" does not exist'
    );
  });

  it("should insert records successfully", async () => {
    // Connection check
    mockQuery
      .mockResolvedValueOnce({ rows: [{}] }) // SELECT 1
      .mockResolvedValueOnce({
        rows: [
          {
            column_name: "name",
            data_type: "text",
            is_nullable: "YES",
            column_default: null,
          },
        ],
      }) // get columns
      .mockResolvedValueOnce({ rows: [] }); // insert query result

    const response = await request(app)
      .post("/api/data/insert")
      .send({
        databaseId: "test_db",
        data: {
          users: [{ name: "Siddhartha" }],
        },
      });

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.insertedRecords).toBe(1);
    expect(response.body.details[0].recordsInserted).toBe(1);
  });

  it("should handle insert errors per record", async () => {
    // Connection check
    mockQuery
      .mockResolvedValueOnce({ rows: [{}] }) // SELECT 1
      .mockResolvedValueOnce({
        rows: [
          {
            column_name: "name",
            data_type: "text",
            is_nullable: "YES",
            column_default: null,
          },
        ],
      }) // columns
      .mockRejectedValueOnce(new Error("Insert failed")); // insert query fails

    const response = await request(app)
      .post("/api/data/insert")
      .send({
        databaseId: "test_db",
        data: { users: [{ name: "Test User" }] },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.details[0].errors[0]).toContain("Insert failed");
  });

  it("should handle unexpected server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Create a scenario where the main route logic fails
    // by making the request body processing fail
    const originalEntries = Object.entries;
    jest.spyOn(Object, "entries").mockImplementationOnce(() => {
      throw new Error("Unexpected failure");
    });

    const response = await request(app)
      .post("/api/data/insert")
      .send({
        databaseId: "test_db",
        data: { users: [{ name: "Siddhartha" }] },
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Unexpected failure");

    // Restore the mock
    Object.entries = originalEntries;
  });

  it("should handle empty data object", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // Connection check

    const response = await request(app).post("/api/data/insert").send({
      databaseId: "test_db",
      data: {}, // Empty data object
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.insertedRecords).toBe(0);
    expect(response.body.details).toEqual([]);
  });

  it("should handle multiple tables with mixed success", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{}] }) // Connection check
      .mockResolvedValueOnce({
        rows: [
          {
            column_name: "name",
            data_type: "text",
            is_nullable: "YES",
            column_default: null,
          },
        ],
      }) // users table columns
      .mockResolvedValueOnce({ rows: [] }) // users insert success
      .mockResolvedValueOnce({ rows: [] }); // products table (no columns - doesn't exist)

    const response = await request(app)
      .post("/api/data/insert")
      .send({
        databaseId: "test_db",
        data: {
          users: [{ name: "John" }],
          products: [{ title: "Product 1" }],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.insertedRecords).toBe(1);
    expect(response.body.details).toHaveLength(2);
    expect(response.body.details[0].recordsInserted).toBe(1);
    expect(response.body.details[1].errors).toContain(
      'Table "products" does not exist in the database'
    );
  });

  it("should handle invalid data format for table", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // Connection check

    const response = await request(app)
      .post("/api/data/insert")
      .send({
        databaseId: "test_db",
        data: {
          users: "invalid", // Should be array
          products: [], // Empty array
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.insertedRecords).toBe(0);
    expect(response.body.details).toHaveLength(2);
    expect(response.body.details[0].errors).toContain(
      "No records provided or invalid format"
    );
    expect(response.body.details[1].errors).toContain(
      "No records provided or invalid format"
    );
  });
});
