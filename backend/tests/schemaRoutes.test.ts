import request from "supertest";
import express from "express";
import schemaRouter from "../src/routes/schema";
import { MermaidParser } from "../src/utils/mermaidParser";
import { TypeMapper } from "../src/utils/typeMapper";
import { SchemaManager } from "../src/db/schemaManager";

// Mock dependencies
jest.mock("../src/utils/mermaidParser");
jest.mock("../src/utils/typeMapper");
jest.mock("../src/db/schemaManager");

const MockedMermaidParser = MermaidParser as jest.Mocked<typeof MermaidParser>;
const MockedTypeMapper = TypeMapper as jest.Mocked<typeof TypeMapper>;
const MockedSchemaManager = SchemaManager as jest.Mocked<typeof SchemaManager>;

describe("Schema Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Create express app with schema routes
    app = express();
    app.use(express.json());
    app.use("/api/schema", schemaRouter);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("POST /api/schema/create-from-mermaid", () => {
    const validMermaidDiagram = `
      erDiagram
        User {
          int id
          string name
          string email
        }
    `;

    const mockParsedDiagram = {
      entities: [
        {
          name: "User",
          attributes: [
            { name: "id", type: "int" },
            { name: "name", type: "string" },
            { name: "email", type: "string" }
          ]
        }
      ]
    };

    const mockTables = [
      {
        name: "user",
        columns: [
          { name: "id", type: "int", sqlType: "INT" },
          { name: "name", type: "string", sqlType: "VARCHAR(255)" },
          { name: "email", type: "string", sqlType: "VARCHAR(255)" }
        ]
      }
    ];

    beforeEach(() => {
      MockedMermaidParser.isValidMermaidDiagram.mockReturnValue(true);
      MockedMermaidParser.parse.mockReturnValue(mockParsedDiagram);
      MockedTypeMapper.entitiesToTables.mockReturnValue(mockTables);
      MockedSchemaManager.createTables.mockResolvedValue({
        success: true,
        tablesCreated: ["user"],
        metadata: { tables: mockTables }
      });
      MockedSchemaManager.generateSchemaSummary.mockReturnValue("Table \"user\": id (INT), name (VARCHAR(255)), email (VARCHAR(255))");
    });

    test("successfully creates tables from valid mermaid diagram", async () => {
      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: validMermaidDiagram });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: "Successfully created 1 table(s)",
        tablesCreated: ["user"],
        metadata: { tables: mockTables },
        schemaSummary: expect.any(String)
      });

      expect(MockedMermaidParser.isValidMermaidDiagram).toHaveBeenCalledWith(validMermaidDiagram);
      expect(MockedMermaidParser.parse).toHaveBeenCalledWith(validMermaidDiagram);
      expect(MockedTypeMapper.entitiesToTables).toHaveBeenCalledWith(mockParsedDiagram.entities);
      expect(MockedSchemaManager.createTables).toHaveBeenCalledWith(mockTables, false);
    });

    test("creates tables with dropExisting option", async () => {
      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ 
          mermaidDiagram: validMermaidDiagram,
          dropExisting: true
        });

      expect(response.status).toBe(201);
      expect(MockedSchemaManager.createTables).toHaveBeenCalledWith(mockTables, true);
    });

    test("returns 400 for missing mermaidDiagram", async () => {
      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid mermaidDiagram in request body"
      });

      expect(MockedMermaidParser.isValidMermaidDiagram).not.toHaveBeenCalled();
    });

    test("returns 400 for invalid mermaidDiagram type", async () => {
      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Missing or invalid mermaidDiagram in request body"
      });
    });

    test("returns 400 for invalid mermaid diagram format", async () => {
      MockedMermaidParser.isValidMermaidDiagram.mockReturnValue(false);

      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: "invalid diagram" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Invalid Mermaid ER diagram format. Please check your syntax."
      });
    });

    test("returns 400 when no entities found", async () => {
      MockedMermaidParser.parse.mockReturnValue({ entities: [] });

      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: validMermaidDiagram });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "No entities found in the Mermaid diagram"
      });
    });

    test("returns 500 when table creation fails", async () => {
      MockedSchemaManager.createTables.mockResolvedValue({
        success: false,
        tablesCreated: [],
        metadata: { tables: [] },
        error: "Database connection failed"
      });

      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: validMermaidDiagram });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Database connection failed",
        tablesCreated: []
      });
    });

    test("returns 500 when table creation fails without error message", async () => {
      MockedSchemaManager.createTables.mockResolvedValue({
        success: false,
        tablesCreated: [],
        metadata: { tables: [] }
      });

      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: validMermaidDiagram });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to create tables",
        tablesCreated: []
      });
    });

    test("handles unexpected errors", async () => {
      MockedMermaidParser.parse.mockImplementation(() => {
        throw new Error("Unexpected parsing error");
      });

      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: validMermaidDiagram });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Unexpected parsing error"
      });
    });

    test("handles non-Error exceptions", async () => {
      MockedMermaidParser.parse.mockImplementation(() => {
        throw "String error";
      });

      const response = await request(app)
        .post("/api/schema/create-from-mermaid")
        .send({ mermaidDiagram: validMermaidDiagram });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Internal server error"
      });
    });
  });

  describe("GET /api/schema/metadata", () => {
    const mockMetadata = {
      tables: [
        {
          name: "users",
          columns: [
            { name: "id", type: "int", sqlType: "INT" },
            { name: "name", type: "string", sqlType: "VARCHAR(255)" }
          ]
        }
      ]
    };

    beforeEach(() => {
      MockedSchemaManager.getMetadata.mockReturnValue(mockMetadata);
      MockedSchemaManager.getTableNames.mockReturnValue(["users"]);
      MockedSchemaManager.generateSchemaSummary.mockReturnValue("Table \"users\": id (INT), name (VARCHAR(255))");
    });

    test("returns schema metadata successfully", async () => {
      const response = await request(app)
        .get("/api/schema/metadata");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        metadata: mockMetadata,
        tableCount: 1,
        tableNames: ["users"],
        schemaSummary: expect.any(String)
      });

      expect(MockedSchemaManager.getMetadata).toHaveBeenCalled();
      expect(MockedSchemaManager.getTableNames).toHaveBeenCalled();
      expect(MockedSchemaManager.generateSchemaSummary).toHaveBeenCalled();
    });

    test("handles errors in metadata retrieval", async () => {
      MockedSchemaManager.getMetadata.mockImplementation(() => {
        throw new Error("Metadata error");
      });

      const response = await request(app)
        .get("/api/schema/metadata");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Metadata error"
      });
    });

    test("handles non-Error exceptions in metadata retrieval", async () => {
      MockedSchemaManager.getMetadata.mockImplementation(() => {
        throw "String error";
      });

      const response = await request(app)
        .get("/api/schema/metadata");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Internal server error"
      });
    });
  });

  describe("GET /api/schema/tables/:tableName", () => {
    const mockTable = {
      name: "users",
      columns: [
        { name: "id", type: "int", sqlType: "INT" },
        { name: "name", type: "string", sqlType: "VARCHAR(255)" }
      ]
    };

    test("returns table information for existing table", async () => {
      MockedSchemaManager.getTable.mockReturnValue(mockTable);

      const response = await request(app)
        .get("/api/schema/tables/users");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        table: mockTable
      });

      expect(MockedSchemaManager.getTable).toHaveBeenCalledWith("users");
    });

    test("returns 404 for non-existent table", async () => {
      MockedSchemaManager.getTable.mockReturnValue(undefined);

      const response = await request(app)
        .get("/api/schema/tables/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: "Table 'nonexistent' not found"
      });
    });

    test("returns 400 for empty table name", async () => {
      const response = await request(app)
        .get("/api/schema/tables/");

      expect(response.status).toBe(404); // Express returns 404 for missing route parameters
    });

    test("handles errors in table retrieval", async () => {
      MockedSchemaManager.getTable.mockImplementation(() => {
        throw new Error("Table retrieval error");
      });

      const response = await request(app)
        .get("/api/schema/tables/users");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Table retrieval error"
      });
    });
  });

  describe("DELETE /api/schema/clear", () => {
    test("clears schema metadata successfully", async () => {
      const response = await request(app)
        .delete("/api/schema/clear");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Schema metadata cleared"
      });

      expect(MockedSchemaManager.clearMetadata).toHaveBeenCalled();
    });

    test("handles errors in metadata clearing", async () => {
      MockedSchemaManager.clearMetadata.mockImplementation(() => {
        throw new Error("Clear error");
      });

      const response = await request(app)
        .delete("/api/schema/clear");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Clear error"
      });
    });
  });
});