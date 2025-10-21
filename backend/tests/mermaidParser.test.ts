// Tests for MermaidParser utility class
import { MermaidParser } from "../src/utils/mermaidParser";

describe("MermaidParser", () => {
  describe("parse", () => {
    it("should parse a simple entity with attributes", () => {
      const mermaidDiagram = `
        erDiagram
            USER {
                int id
                string name
                string email
            }
      `;

      const result = MermaidParser.parse(mermaidDiagram);

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0]?.name).toBe("USER");
      expect(result.entities[0]?.attributes).toHaveLength(3);
      expect(result.entities[0]?.attributes[0]).toEqual({
        type: "int",
        name: "id",
      });
      expect(result.entities[0]?.attributes[1]).toEqual({
        type: "string",
        name: "name",
      });
      expect(result.entities[0]?.attributes[2]).toEqual({
        type: "string",
        name: "email",
      });
    });

    it("should parse multiple entities", () => {
      const mermaidDiagram = `
        erDiagram
            USER {
                int id
                string name
            }
            POST {
                int id
                int user_id
                string title
            }
      `;

      const result = MermaidParser.parse(mermaidDiagram);

      expect(result.entities).toHaveLength(2);
      expect(result.entities[0]?.name).toBe("USER");
      expect(result.entities[1]?.name).toBe("POST");
    });

    it("should handle entities with various data types", () => {
      const mermaidDiagram = `
        erDiagram
            EXAMPLE {
                int id
                string name
                date created_at
                boolean active
                decimal price
                timestamp updated_at
            }
      `;

      const result = MermaidParser.parse(mermaidDiagram);

      expect(result.entities[0]?.attributes).toHaveLength(6);
      expect(result.entities[0]?.attributes.map((attr) => attr.type)).toEqual([
        "int",
        "string",
        "date",
        "boolean",
        "decimal",
        "timestamp",
      ]);
    });

    it("should throw error for invalid diagram", () => {
      const invalidDiagram = "invalid mermaid content";

      expect(() => MermaidParser.parse(invalidDiagram)).toThrow();
    });

    it("should throw error for empty diagram", () => {
      expect(() => MermaidParser.parse("")).toThrow();
    });

    it("should handle whitespace and formatting variations", () => {
      const mermaidDiagram = `
        erDiagram
          USER   {
            int     id
              string   name
          }
      `;

      const result = MermaidParser.parse(mermaidDiagram);

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0]?.name).toBe("USER");
      expect(result.entities[0]?.attributes).toHaveLength(2);
    });
  });

  describe("isValidMermaidDiagram", () => {
    it("should return true for valid diagrams", () => {
      const validDiagram = `
        erDiagram
            USER {
                int id
                string name
            }
      `;

      expect(MermaidParser.isValidMermaidDiagram(validDiagram)).toBe(true);
    });

    it("should return false for invalid diagrams", () => {
      expect(MermaidParser.isValidMermaidDiagram("invalid")).toBe(false);
      expect(MermaidParser.isValidMermaidDiagram("")).toBe(false);
      expect(MermaidParser.isValidMermaidDiagram("just some text")).toBe(false);
    });
  });
});
