import request from "supertest";
import express from "express";
import dataRouter from "../src/routes/data";
import { MultiDatabaseManager } from "../src/db/multiDatabaseManager";
import { LOCAL_DB_ID } from "../src/types/database";

// Mock MultiDatabaseManager
jest.mock("../src/db/multiDatabaseManager");
const MockedMultiDatabaseManager = MultiDatabaseManager as jest.Mocked<
  typeof MultiDatabaseManager
>;

describe("Data Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Create express app with data routes
    app = express();
    app.use(express.json());
    app.use("/api/data", dataRouter);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("POST /api/data/insert", () => {
    const validRequest = {
      databaseId: LOCAL_DB_ID,
      data: {
        users: [
          { name: "John Doe", email: "john@example.com" },
          { name: "Jane Smith", email: "jane@example.com" },
        ],
        products: [{ title: "Product 1", price: 99.99, active: true }],
      },
    };

    const mockColumnsResult = {
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

    beforeEach(() => {
      // Reset mocks without pre-setting any default behavior
      // Each test will set up its own mock sequence
    });

    test("successfully inserts data into valid tables", async () => {
      // Mock connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      });

      // Mock table columns query for users
      MockedMultiDatabaseManager.query.mockResolvedValueOnce(mockColumnsResult);

      // Mock insert queries for users
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // Insert user 1
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // Insert user 2

      // Mock table columns query for products
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
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
            is_nullable: "NO",
            column_default: null,
          },
          {
            column_name: "active",
            data_type: "boolean",
            is_nullable: "YES",
            column_default: null,
          },
        ],
      });

      // Mock insert query for product
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/data/insert")
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.insertedRecords).toBe(3);
      expect(response.body.details).toHaveLength(2);
      expect(response.body.details[0]).toEqual({
        table: "users",
        recordsInserted: 2,
      });
      expect(response.body.details[1]).toEqual({
        table: "products",
        recordsInserted: 1,
      });

      // Verify MultiDatabaseManager was called correctly
      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        "SELECT 1",
        [],
        LOCAL_DB_ID
      );
    });

    test("uses MultiDatabaseManager for database operations", async () => {
      // Mock successful connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      });

      await request(app)
        .post("/api/data/insert")
        .send({ ...validRequest, data: {} });

      expect(MockedMultiDatabaseManager.query).toHaveBeenCalledWith(
        "SELECT 1",
        [],
        LOCAL_DB_ID
      );
    });

    test("returns 400 for missing database ID", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ data: validRequest.data });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid database ID",
      });
    });

    test("returns 400 for invalid database ID type", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ databaseId: 123, data: validRequest.data });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid database ID",
      });
    });

    test("returns 400 for missing data object", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ databaseId: LOCAL_DB_ID });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid data object",
      });
    });

    test("returns 400 for invalid data object type", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ databaseId: LOCAL_DB_ID, data: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid data object",
      });
    });

    test("returns 400 when cannot connect to database", async () => {
      MockedMultiDatabaseManager.query.mockRejectedValueOnce(
        new Error("Connection failed")
      );

      const response = await request(app)
        .post("/api/data/insert")
        .send(validRequest);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: `Cannot connect to database with ID "${LOCAL_DB_ID}". Please check the connection.`,
      });
    });

    test("handles empty records array", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [],
            products: "invalid",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        insertedRecords: 0,
        details: [
          {
            table: "users",
            recordsInserted: 0,
            errors: ["No records provided or invalid format"],
          },
          {
            table: "products",
            recordsInserted: 0,
            errors: ["No records provided or invalid format"],
          },
        ],
      });
    });

    test("handles non-existent table", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // Empty columns result

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            nonexistent: [{ name: "test" }],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        insertedRecords: 0,
        details: [
          {
            table: "nonexistent",
            recordsInserted: 0,
            errors: ['Table "nonexistent" does not exist in the database'],
          },
        ],
      });
    });

    test("handles insert errors for individual records", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce(mockColumnsResult); // Table columns
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // First insert succeeds
      MockedMultiDatabaseManager.query.mockRejectedValueOnce(
        new Error("Duplicate key value")
      ); // Second insert fails

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [
              { name: "John", email: "john@example.com" },
              { name: "Jane", email: "john@example.com" }, // Duplicate email
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        insertedRecords: 1,
        details: [
          {
            table: "users",
            recordsInserted: 1,
            errors: ["Record 2: Duplicate key value"],
          },
        ],
      });
    });

    test("handles table query errors", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockRejectedValueOnce(
        new Error("Table query failed")
      ); // Columns query fails

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [{ name: "test" }],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        insertedRecords: 0,
        details: [
          {
            table: "users",
            recordsInserted: 0,
            errors: ["Table query failed"],
          },
        ],
      });
    });

    test("handles non-Error exceptions in record insertion", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce(mockColumnsResult); // Table columns
      MockedMultiDatabaseManager.query.mockRejectedValueOnce("String error"); // Insert fails with non-Error

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [{ name: "test" }],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        insertedRecords: 0,
        details: [
          {
            table: "users",
            recordsInserted: 0,
            errors: ["Record 1: Unknown error"],
          },
        ],
      });
    });

    test("handles non-Error exceptions in table processing", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockImplementationOnce(() => {
        throw "String error";
      });

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [{ name: "test" }],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        insertedRecords: 0,
        details: [
          {
            table: "users",
            recordsInserted: 0,
            errors: ["Unknown error"],
          },
        ],
      });
    });

    test("handles unexpected server errors", async () => {
      MockedMultiDatabaseManager.query.mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const response = await request(app)
        .post("/api/data/insert")
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Unexpected error",
      });
    });

    test("handles non-Error exceptions in server processing", async () => {
      MockedMultiDatabaseManager.query.mockImplementationOnce(() => {
        throw "String error";
      });

      const response = await request(app)
        .post("/api/data/insert")
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Internal server error",
      });
    });

    test("properly handles null values in records", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce(mockColumnsResult); // Table columns
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // Insert 1
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // Insert 2

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [
              { name: "John", email: null }, // Explicit null
              { name: "Jane" }, // Missing email (should be null)
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.insertedRecords).toBe(2);

      // Verify the insert queries were called with correct parameters
      const insertCalls = MockedMultiDatabaseManager.query.mock.calls.filter(
        (call: any) =>
          typeof call[0] === "string" && call[0].includes("INSERT INTO")
      );

      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0]![1]).toEqual(["John", null]); // name, email
      expect(insertCalls[1]![1]).toEqual(["Jane", null]); // name, email (undefined becomes null)
    });

    test("filters out auto-increment id columns", async () => {
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({
        rows: [{ "?column?": 1 }],
      }); // Connection test
      MockedMultiDatabaseManager.query.mockResolvedValueOnce(mockColumnsResult); // Table columns (includes auto-increment id)
      MockedMultiDatabaseManager.query.mockResolvedValueOnce({ rows: [] }); // Insert

      await request(app)
        .post("/api/data/insert")
        .send({
          databaseId: LOCAL_DB_ID,
          data: {
            users: [{ id: 999, name: "John", email: "john@example.com" }],
          },
        });

      // Check that the insert query doesn't include the id column
      const insertCall = MockedMultiDatabaseManager.query.mock.calls.find(
        (call: any) =>
          typeof call[0] === "string" && call[0].includes("INSERT INTO")
      );

      expect(insertCall![0]).toContain('"name", "email"');
      expect(insertCall![0]).not.toContain('"id"');
      expect(insertCall![1]).toEqual(["John", "john@example.com"]);
    });
  });
});
