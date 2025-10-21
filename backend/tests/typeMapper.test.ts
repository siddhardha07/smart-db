import { TypeMapper } from "../src/utils/typeMapper";
import { MermaidEntity } from "../src/types";

describe("TypeMapper", () => {
  describe("mapType", () => {
    test("maps common types correctly", () => {
      expect(TypeMapper.mapType("string")).toBe("VARCHAR(255)");
      expect(TypeMapper.mapType("int")).toBe("INT");
      expect(TypeMapper.mapType("integer")).toBe("INT");
      expect(TypeMapper.mapType("text")).toBe("TEXT");
      expect(TypeMapper.mapType("date")).toBe("DATE");
      expect(TypeMapper.mapType("datetime")).toBe("TIMESTAMP");
      expect(TypeMapper.mapType("timestamp")).toBe("TIMESTAMP");
      expect(TypeMapper.mapType("boolean")).toBe("BOOLEAN");
      expect(TypeMapper.mapType("bool")).toBe("BOOLEAN");
      expect(TypeMapper.mapType("float")).toBe("FLOAT");
      expect(TypeMapper.mapType("decimal")).toBe("DECIMAL");
      expect(TypeMapper.mapType("number")).toBe("NUMERIC");
    });

    test("handles case insensitive input", () => {
      expect(TypeMapper.mapType("STRING")).toBe("VARCHAR(255)");
      expect(TypeMapper.mapType("Int")).toBe("INT");
      expect(TypeMapper.mapType("BOOLEAN")).toBe("BOOLEAN");
    });

    test("handles whitespace in input", () => {
      expect(TypeMapper.mapType("  string  ")).toBe("VARCHAR(255)");
      expect(TypeMapper.mapType("\tint\n")).toBe("INT");
    });

    test("returns default type for unknown types", () => {
      expect(TypeMapper.mapType("unknown")).toBe("VARCHAR(255)");
      expect(TypeMapper.mapType("custom")).toBe("VARCHAR(255)");
      expect(TypeMapper.mapType("")).toBe("VARCHAR(255)");
    });

    test("emits warning for unknown types", () => {
      const originalEmitWarning = process.emitWarning;
      const mockEmitWarning = jest.fn();
      process.emitWarning = mockEmitWarning;

      TypeMapper.mapType("unknown");
      expect(mockEmitWarning).toHaveBeenCalledWith(
        "Unknown type 'unknown', defaulting to VARCHAR(255)"
      );

      process.emitWarning = originalEmitWarning;
    });
  });

  describe("entitiesToTables", () => {
    test("converts entities to database tables correctly", () => {
      const entities: MermaidEntity[] = [
        {
          name: "User",
          attributes: [
            { name: "id", type: "int" },
            { name: "name", type: "string" },
            { name: "email", type: "string" },
            { name: "createdAt", type: "datetime" }
          ]
        },
        {
          name: "Product",
          attributes: [
            { name: "id", type: "int" },
            { name: "title", type: "string" },
            { name: "price", type: "decimal" },
            { name: "inStock", type: "boolean" }
          ]
        }
      ];

      const result = TypeMapper.entitiesToTables(entities);

      expect(result).toHaveLength(2);
      
      // Check User table
      const userTable = result[0]!;
      expect(userTable.name).toBe("user");
      expect(userTable.columns).toHaveLength(4);
      expect(userTable.columns[0]).toEqual({
        name: "id",
        type: "int",
        sqlType: "INT"
      });
      expect(userTable.columns[1]).toEqual({
        name: "name",
        type: "string",
        sqlType: "VARCHAR(255)"
      });

      // Check Product table
      const productTable = result[1]!;
      expect(productTable.name).toBe("product");
      expect(productTable.columns).toHaveLength(4);
      expect(productTable.columns[2]).toEqual({
        name: "price",
        type: "decimal",
        sqlType: "DECIMAL"
      });
      expect(productTable.columns[3]).toEqual({
        name: "instock",
        type: "boolean",
        sqlType: "BOOLEAN"
      });
    });

    test("handles empty entities array", () => {
      const result = TypeMapper.entitiesToTables([]);
      expect(result).toEqual([]);
    });

    test("converts names to lowercase for PostgreSQL convention", () => {
      const entities: MermaidEntity[] = [
        {
          name: "UPPER_CASE_TABLE",
          attributes: [
            { name: "UPPER_CASE_COLUMN", type: "string" }
          ]
        }
      ];

      const result = TypeMapper.entitiesToTables(entities);
      
      expect(result[0]!.name).toBe("upper_case_table");
      expect(result[0]!.columns[0]!.name).toBe("upper_case_column");
    });
  });

  describe("isValidColumnName", () => {
    test("validates correct column names", () => {
      expect(TypeMapper.isValidColumnName("id")).toBe(true);
      expect(TypeMapper.isValidColumnName("user_name")).toBe(true);
      expect(TypeMapper.isValidColumnName("_private")).toBe(true);
      expect(TypeMapper.isValidColumnName("column123")).toBe(true);
      expect(TypeMapper.isValidColumnName("a".repeat(63))).toBe(true);
    });

    test("rejects invalid column names", () => {
      expect(TypeMapper.isValidColumnName("123column")).toBe(false); // starts with number
      expect(TypeMapper.isValidColumnName("column-name")).toBe(false); // contains hyphen
      expect(TypeMapper.isValidColumnName("column name")).toBe(false); // contains space
      expect(TypeMapper.isValidColumnName("column@name")).toBe(false); // contains special char
      expect(TypeMapper.isValidColumnName("")).toBe(false); // empty string
      expect(TypeMapper.isValidColumnName("a".repeat(64))).toBe(false); // too long
    });
  });

  describe("isValidTableName", () => {
    test("validates correct table names", () => {
      expect(TypeMapper.isValidTableName("users")).toBe(true);
      expect(TypeMapper.isValidTableName("user_profiles")).toBe(true);
      expect(TypeMapper.isValidTableName("_temp")).toBe(true);
      expect(TypeMapper.isValidTableName("table123")).toBe(true);
    });

    test("rejects invalid table names", () => {
      expect(TypeMapper.isValidTableName("123table")).toBe(false);
      expect(TypeMapper.isValidTableName("table-name")).toBe(false);
      expect(TypeMapper.isValidTableName("table name")).toBe(false);
      expect(TypeMapper.isValidTableName("table@name")).toBe(false);
      expect(TypeMapper.isValidTableName("")).toBe(false);
    });
  });

  describe("getSupportedTypes", () => {
    test("returns all supported types", () => {
      const supportedTypes = TypeMapper.getSupportedTypes();
      
      expect(supportedTypes).toContain("int");
      expect(supportedTypes).toContain("string");
      expect(supportedTypes).toContain("boolean");
      expect(supportedTypes).toContain("date");
      expect(supportedTypes).toContain("float");
      expect(supportedTypes).toContain("decimal");
      expect(supportedTypes).toContain("text");
      expect(supportedTypes).toContain("datetime");
      expect(supportedTypes).toContain("timestamp");
      expect(supportedTypes).toContain("integer");
      expect(supportedTypes).toContain("bool");
      expect(supportedTypes).toContain("number");
    });

    test("returns correct number of supported types", () => {
      const supportedTypes = TypeMapper.getSupportedTypes();
      expect(supportedTypes).toHaveLength(12);
    });
  });
});