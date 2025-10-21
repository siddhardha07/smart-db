import { SchemaManager } from "../src/db/schemaManager";
import { DatabaseConnection } from "../src/db/dbConnection";
import { TypeMapper } from "../src/utils/typeMapper";
import { DatabaseTable } from "../src/types";

// Mock dependencies
jest.mock("../src/db/dbConnection");
jest.mock("../src/utils/typeMapper");

const MockedDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>;
const MockedTypeMapper = TypeMapper as jest.Mocked<typeof TypeMapper>;

describe("SchemaManager", () => {
  const sampleTables: DatabaseTable[] = [
    {
      name: "users",
      columns: [
        { name: "id", type: "int", sqlType: "INT" },
        { name: "name", type: "string", sqlType: "VARCHAR(255)" },
        { name: "email", type: "string", sqlType: "VARCHAR(255)" }
      ]
    },
    {
      name: "products",
      columns: [
        { name: "title", type: "string", sqlType: "VARCHAR(255)" },
        { name: "price", type: "decimal", sqlType: "DECIMAL" },
        { name: "active", type: "boolean", sqlType: "BOOLEAN" }
      ]
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear metadata
    SchemaManager.clearMetadata();
    
    // Setup default mock behaviors
    MockedTypeMapper.isValidTableName.mockReturnValue(true);
    MockedTypeMapper.isValidColumnName.mockReturnValue(true);
    MockedDatabaseConnection.query.mockResolvedValue({ rows: [] });
    MockedDatabaseConnection.dropTableIfExists.mockResolvedValue();
  });

  describe("createTables", () => {
    test("creates tables successfully", async () => {
      const result = await SchemaManager.createTables(sampleTables);

      expect(result.success).toBe(true);
      expect(result.tablesCreated).toEqual(["users", "products"]);
      expect(result.metadata.tables).toEqual(sampleTables);
      expect(result.error).toBeUndefined();

      // Verify table validation was called
      expect(MockedTypeMapper.isValidTableName).toHaveBeenCalledWith("users");
      expect(MockedTypeMapper.isValidTableName).toHaveBeenCalledWith("products");
      
      // Verify column validation was called
      expect(MockedTypeMapper.isValidColumnName).toHaveBeenCalledWith("id");
      expect(MockedTypeMapper.isValidColumnName).toHaveBeenCalledWith("name");
      expect(MockedTypeMapper.isValidColumnName).toHaveBeenCalledWith("email");
      expect(MockedTypeMapper.isValidColumnName).toHaveBeenCalledWith("title");
      expect(MockedTypeMapper.isValidColumnName).toHaveBeenCalledWith("price");
      expect(MockedTypeMapper.isValidColumnName).toHaveBeenCalledWith("active");

      // Verify SQL execution
      expect(MockedDatabaseConnection.query).toHaveBeenCalledTimes(2);
    });

    test("drops existing tables when dropExisting is true", async () => {
      await SchemaManager.createTables(sampleTables, true);

      expect(MockedDatabaseConnection.dropTableIfExists).toHaveBeenCalledWith("users");
      expect(MockedDatabaseConnection.dropTableIfExists).toHaveBeenCalledWith("products");
      expect(MockedDatabaseConnection.dropTableIfExists).toHaveBeenCalledTimes(2);
    });

    test("does not drop tables when dropExisting is false", async () => {
      await SchemaManager.createTables(sampleTables, false);

      expect(MockedDatabaseConnection.dropTableIfExists).not.toHaveBeenCalled();
    });

    test("handles invalid table name", async () => {
      MockedTypeMapper.isValidTableName.mockReturnValueOnce(false);

      const result = await SchemaManager.createTables(sampleTables);

      expect(result.success).toBe(false);
      expect(result.tablesCreated).toEqual([]);
      expect(result.error).toBe("Invalid table name: users");
      expect(MockedDatabaseConnection.query).not.toHaveBeenCalled();
    });

    test("handles invalid column name", async () => {
      MockedTypeMapper.isValidColumnName.mockReturnValueOnce(false);

      const result = await SchemaManager.createTables(sampleTables);

      expect(result.success).toBe(false);
      expect(result.tablesCreated).toEqual([]);
      expect(result.error).toBe("Invalid column name: id in table users");
      expect(MockedDatabaseConnection.query).not.toHaveBeenCalled();
    });

    test("handles database query failure", async () => {
      MockedDatabaseConnection.query.mockRejectedValueOnce(new Error("Database error"));

      const result = await SchemaManager.createTables(sampleTables);

      expect(result.success).toBe(false);
      expect(result.tablesCreated).toEqual([]);
      expect(result.error).toBe("Database error");
    });

    test("handles non-Error exceptions", async () => {
      MockedDatabaseConnection.query.mockRejectedValueOnce("String error");

      const result = await SchemaManager.createTables(sampleTables);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error occurred");
    });

    test("creates table with auto-generated id when no id column exists", async () => {
      const tablesWithoutId: DatabaseTable[] = [
        {
          name: "categories",
          columns: [
            { name: "name", type: "string", sqlType: "VARCHAR(255)" },
            { name: "description", type: "text", sqlType: "TEXT" }
          ]
        }
      ];

      await SchemaManager.createTables(tablesWithoutId);

      expect(MockedDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('"id" SERIAL PRIMARY KEY')
      );
    });

    test("does not add auto-generated id when id column already exists", async () => {
      await SchemaManager.createTables(sampleTables);

      // Check that the query doesn't contain SERIAL PRIMARY KEY for users table (which has id)
      const calls = MockedDatabaseConnection.query.mock.calls;
      const userTableCall = calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"users"')
      );
      expect(userTableCall![0]).not.toContain('SERIAL PRIMARY KEY');
    });

    test("handles partial table creation failure", async () => {
      // First table succeeds, second fails
      MockedDatabaseConnection.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("Second table failed"));

      const result = await SchemaManager.createTables(sampleTables);

      expect(result.success).toBe(false);
      expect(result.tablesCreated).toEqual(["users"]);
      expect(result.error).toBe("Second table failed");
    });
  });

  describe("generateCreateTableSQL", () => {
    test("throws error for table with no columns", () => {
      const emptyTable: DatabaseTable = { name: "empty", columns: [] };

      expect(() => {
        (SchemaManager as any).generateCreateTableSQL(emptyTable);
      }).toThrow("Table empty has no columns");
    });

    test("generates correct SQL for table with id column", () => {
      const table: DatabaseTable = {
        name: "users",
        columns: [
          { name: "id", type: "int", sqlType: "INT" },
          { name: "name", type: "string", sqlType: "VARCHAR(255)" }
        ]
      };

      const sql = (SchemaManager as any).generateCreateTableSQL(table);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
      expect(sql).toContain('"id" INT');
      expect(sql).toContain('"name" VARCHAR(255)');
      expect(sql).not.toContain('SERIAL PRIMARY KEY');
    });

    test("generates correct SQL for table without id column", () => {
      const table: DatabaseTable = {
        name: "categories",
        columns: [
          { name: "name", type: "string", sqlType: "VARCHAR(255)" }
        ]
      };

      const sql = (SchemaManager as any).generateCreateTableSQL(table);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "categories"');
      expect(sql).toContain('"id" SERIAL PRIMARY KEY');
      expect(sql).toContain('"name" VARCHAR(255)');
    });
  });

  describe("getMetadata", () => {
    test("returns copy of metadata", () => {
      SchemaManager.clearMetadata();
      const metadata1 = SchemaManager.getMetadata();
      const metadata2 = SchemaManager.getMetadata();
      
      // Should return different objects
      expect(metadata1).not.toBe(metadata2);
      
      // But with same content initially
      expect(metadata1.tables).toEqual(metadata2.tables);
    });

    test("returns current metadata after table creation", async () => {
      await SchemaManager.createTables(sampleTables);
      
      const metadata = SchemaManager.getMetadata();
      expect(metadata.tables).toEqual(sampleTables);
    });
  });

  describe("clearMetadata", () => {
    test("clears all metadata", async () => {
      await SchemaManager.createTables(sampleTables);
      expect(SchemaManager.getMetadata().tables).toHaveLength(2);
      
      SchemaManager.clearMetadata();
      expect(SchemaManager.getMetadata().tables).toHaveLength(0);
    });
  });

  describe("getTable", () => {
    beforeEach(async () => {
      await SchemaManager.createTables(sampleTables);
    });

    test("returns table by exact name", () => {
      const table = SchemaManager.getTable("users");
      expect(table).toEqual(sampleTables[0]);
    });

    test("returns table by case-insensitive name", () => {
      const table = SchemaManager.getTable("USERS");
      expect(table).toEqual(sampleTables[0]);
    });

    test("returns undefined for non-existent table", () => {
      const table = SchemaManager.getTable("nonexistent");
      expect(table).toBeUndefined();
    });
  });

  describe("getTableNames", () => {
    test("returns empty array when no tables", () => {
      SchemaManager.clearMetadata();
      expect(SchemaManager.getTableNames()).toEqual([]);
    });

    test("returns all table names", async () => {
      await SchemaManager.createTables(sampleTables);
      
      const names = SchemaManager.getTableNames();
      expect(names).toEqual(["users", "products"]);
    });
  });

  describe("hasTables", () => {
    test("returns false when no tables", () => {
      SchemaManager.clearMetadata();
      expect(SchemaManager.hasTables()).toBe(false);
    });

    test("returns true when tables exist", async () => {
      await SchemaManager.createTables(sampleTables);
      expect(SchemaManager.hasTables()).toBe(true);
    });
  });

  describe("generateSchemaSummary", () => {
    test("returns message when no tables", () => {
      SchemaManager.clearMetadata();
      const summary = SchemaManager.generateSchemaSummary();
      expect(summary).toBe("No tables have been created yet.");
    });

    test("generates summary for existing tables", async () => {
      await SchemaManager.createTables(sampleTables);
      
      const summary = SchemaManager.generateSchemaSummary();
      expect(summary).toContain("Database Schema:");
      expect(summary).toContain('Table "users"');
      expect(summary).toContain('Table "products"');
      expect(summary).toContain("id (INT)");
      expect(summary).toContain("name (VARCHAR(255))");
      expect(summary).toContain("email (VARCHAR(255))");
      expect(summary).toContain("title (VARCHAR(255))");
      expect(summary).toContain("price (DECIMAL)");
      expect(summary).toContain("active (BOOLEAN)");
    });
  });
});