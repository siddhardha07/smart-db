import request from "supertest";
import express from "express";
import dataRouter from "../src/routes/data";
import { Pool } from "pg";

// Mock the pg module
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(mockClient),
};

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));

const MockedPool = Pool as jest.MockedClass<typeof Pool>;

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
      database: "testdb",
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
      // Mock table columns query for users
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockResolvedValueOnce(mockColumnsResult) // users table columns
        .mockResolvedValueOnce({ rows: [] }) // Insert user 1
        .mockResolvedValueOnce({ rows: [] }) // Insert user 2
        .mockResolvedValueOnce({
          // products table columns
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
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert product

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

      expect(MockedPool).toHaveBeenCalledWith({
        host: "localhost",
        port: 5432,
        database: "testdb",
        user: "postgres",
        password: "password",
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      expect(mockPool.end).toHaveBeenCalled();
    });

    test("uses environment variables for database connection", async () => {
      // Set environment variables
      process.env.DB_HOST = "testhost";
      process.env.DB_PORT = "5433";
      process.env.DB_USER = "testuser";
      process.env.DB_PASSWORD = "testpass";

      mockPool.query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

      await request(app)
        .post("/api/data/insert")
        .send({ ...validRequest, data: {} });

      expect(MockedPool).toHaveBeenCalledWith({
        host: "testhost",
        port: 5433,
        database: "testdb",
        user: "testuser",
        password: "testpass",
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Clean up environment variables
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
    });

    test("returns 400 for missing database name", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ data: validRequest.data });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid database name",
      });

      expect(mockPool.end).not.toHaveBeenCalled();
    });

    test("returns 400 for invalid database name type", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ database: 123, data: validRequest.data });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid database name",
      });
    });

    test("returns 400 for missing data object", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ database: "testdb" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid data object",
      });
    });

    test("returns 400 for invalid data object type", async () => {
      const response = await request(app)
        .post("/api/data/insert")
        .send({ database: "testdb", data: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid data object",
      });
    });

    test("returns 400 when cannot connect to database", async () => {
      mockPool.query.mockReset();
      mockPool.query.mockRejectedValueOnce(new Error("Connection failed"));

      const response = await request(app)
        .post("/api/data/insert")
        .send(validRequest);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error:
          'Cannot connect to database "testdb". Please check if the database exists.',
      });

      expect(mockPool.end).toHaveBeenCalled();
    });

    test("handles empty records array", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // Connection test

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockResolvedValueOnce({ rows: [] }); // Empty columns result

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
            errors: ['Table "nonexistent" does not exist in database "testdb"'],
          },
        ],
      });
    });

    test("handles insert errors for individual records", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockResolvedValueOnce(mockColumnsResult) // Table columns
        .mockResolvedValueOnce({ rows: [] }) // First insert succeeds
        .mockRejectedValueOnce(new Error("Duplicate key value")); // Second insert fails

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockRejectedValueOnce(new Error("Table query failed")); // Columns query fails

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockResolvedValueOnce(mockColumnsResult) // Table columns
        .mockRejectedValueOnce("String error"); // Insert fails with non-Error

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockImplementationOnce(() => {
          throw "String error";
        });

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
      MockedPool.mockImplementationOnce(() => {
        throw new Error("Pool creation failed");
      });

      const response = await request(app)
        .post("/api/data/insert")
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Pool creation failed",
      });
    });

    test("handles non-Error exceptions in server processing", async () => {
      MockedPool.mockImplementationOnce(() => {
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
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockResolvedValueOnce(mockColumnsResult) // Table columns
        .mockResolvedValueOnce({ rows: [] }); // Insert succeeds

      const response = await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
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
      const insertCalls = mockPool.query.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("INSERT INTO")
      );

      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0]![1]).toEqual(["John", null]); // name, email
      expect(insertCalls[1]![1]).toEqual(["Jane", null]); // name, email (undefined becomes null)
    });

    test("filters out auto-increment id columns", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // Connection test
        .mockResolvedValueOnce(mockColumnsResult) // Table columns (includes auto-increment id)
        .mockResolvedValueOnce({ rows: [] }); // Insert

      await request(app)
        .post("/api/data/insert")
        .send({
          database: "testdb",
          data: {
            users: [{ id: 999, name: "John", email: "john@example.com" }],
          },
        });

      // Check that the insert query doesn't include the id column
      const insertCall = mockPool.query.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("INSERT INTO")
      );

      expect(insertCall![0]).toContain('"name", "email"');
      expect(insertCall![0]).not.toContain('"id"');
      expect(insertCall![1]).toEqual(["John", "john@example.com"]);
    });
  });
});
