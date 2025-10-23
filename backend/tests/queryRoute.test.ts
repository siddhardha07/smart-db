import request from "supertest";
import express, { Express } from "express";
import router from "../src/routes/query"; // adjust path as needed
import { SequelizeDbManager } from "../src/db/sequelizeDbManager";

// 🧠 Mock SequelizeDbManager
jest.mock("../src/db/sequelizeDbManager", () => ({
  SequelizeDbManager: {
    query: jest.fn(),
  },
}));

const mockQuery = SequelizeDbManager.query as jest.Mock;

let app: Express;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api", router);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/query", () => {
  it("should return 400 if query is missing", async () => {
    const response = await request(app)
      .post("/api/query")
      .send({ databaseId: "test_db" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Query is required",
    });
  });

  it("should return 400 if databaseId is missing", async () => {
    const response = await request(app)
      .post("/api/query")
      .send({ query: "SELECT 1" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Database ID is required",
    });
  });

  it("should execute query and return formatted result", async () => {
    // mock DB response
    const mockResult = {
      fields: [{ name: "id" }, { name: "name" }],
      rows: [{ id: 1, name: "Siddu" }],
      rowCount: 1,
    };
    mockQuery.mockResolvedValueOnce(mockResult);

    const response = await request(app).post("/api/query").send({
      query: "SELECT * FROM users",
      databaseId: "test_db",
    });

    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT * FROM users",
      undefined,
      "test_db"
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result.columns).toEqual(["id", "name"]);
    expect(response.body.result.rows).toEqual([{ id: 1, name: "Siddu" }]);
    expect(response.body.result.rowCount).toBe(1);
    expect(response.body.result.executionTime).toMatch(/\d+ms/);
  });

  it("should handle query execution errors gracefully", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Syntax error in SQL"));

    const response = await request(app).post("/api/query").send({
      query: "BAD SQL",
      databaseId: "test_db",
    });

    expect(mockQuery).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Syntax error in SQL");
  });

  it("should handle non-Error rejection objects safely", async () => {
    mockQuery.mockRejectedValueOnce("Unexpected issue");

    const response = await request(app).post("/api/query").send({
      query: "SELECT 1",
      databaseId: "test_db",
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Query execution failed");
  });

  it("should handle result with no fields (null or undefined)", async () => {
    const mockResult = {
      fields: undefined,
      rows: [{ id: 1 }],
      rowCount: 1,
    };
    mockQuery.mockResolvedValueOnce(mockResult);

    const response = await request(app).post("/api/query").send({
      query: "SELECT id FROM users",
      databaseId: "test_db",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const { result } = response.body;
    expect(result.columns).toEqual([]); // ✅ Empty because fields were undefined
    expect(result.rows).toEqual([{ id: 1 }]);
    expect(result.rowCount).toBe(1);
    expect(result.executionTime).toMatch(/\d+ms/);
  });

  it("should handle result with missing rows and rowCount", async () => {
    const mockResult = {
      fields: [{ name: "id" }],
      // rows and rowCount are intentionally missing
    };
    mockQuery.mockResolvedValueOnce(mockResult);

    const response = await request(app).post("/api/query").send({
      query: "SELECT * FROM test",
      databaseId: "test_db",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const { result } = response.body;
    expect(result.columns).toEqual(["id"]);
    expect(result.rows).toEqual([]); // ✅ Default fallback
    expect(result.rowCount).toBe(0); // ✅ Default fallback
    expect(result.executionTime).toMatch(/\d+ms/);
  });
});
