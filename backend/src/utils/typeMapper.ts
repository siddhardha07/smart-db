import {
  MermaidEntity,
  DatabaseTable,
  DatabaseColumn,
  TableMetadata,
} from "../types";

/**
 * Type mapper for converting Mermaid types to PostgreSQL types
 */
export class TypeMapper {
  private static readonly TYPE_MAPPING: Record<string, string> = {
    int: "INT",
    integer: "INT",
    string: "VARCHAR(255)",
    text: "TEXT",
    date: "DATE",
    datetime: "TIMESTAMP",
    timestamp: "TIMESTAMP",
    boolean: "BOOLEAN",
    bool: "BOOLEAN",
    float: "FLOAT",
    decimal: "DECIMAL",
    number: "NUMERIC",
  };

  /**
   * Map a Mermaid type to PostgreSQL type
   * @param mermaidType - The type from Mermaid diagram
   * @returns PostgreSQL type string
   */
  static mapType(mermaidType: string): string {
    const normalizedType = mermaidType.toLowerCase().trim();
    const sqlType = this.TYPE_MAPPING[normalizedType];

    if (!sqlType) {
      process.emitWarning(`Unknown type '${mermaidType}', defaulting to VARCHAR(255)`);
      return "VARCHAR(255)";
    }

    return sqlType;
  }

  /**
   * Convert Mermaid entities to database table definitions
   * @param entities - Array of parsed Mermaid entities
   * @returns Array of database table definitions
   */
  static entitiesToTables(entities: MermaidEntity[]): DatabaseTable[] {
    return entities.map((entity) => ({
      name: entity.name.toLowerCase(), // PostgreSQL convention
      columns: entity.attributes.map((attr) => ({
        name: attr.name.toLowerCase(), // PostgreSQL convention
        type: attr.type,
        sqlType: this.mapType(attr.type),
      })),
    }));
  }

  /**
   * Validate column name for PostgreSQL
   * @param columnName - Column name to validate
   * @returns True if valid, false otherwise
   */
  static isValidColumnName(columnName: string): boolean {
    // PostgreSQL column name rules:
    // - Must start with letter or underscore
    // - Can contain letters, digits, underscores
    // - Max 63 characters
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return regex.test(columnName) && columnName.length <= 63;
  }

  /**
   * Validate table name for PostgreSQL
   * @param tableName - Table name to validate
   * @returns True if valid, false otherwise
   */
  static isValidTableName(tableName: string): boolean {
    // Same rules as column names
    return this.isValidColumnName(tableName);
  }

  /**
   * Get all supported Mermaid types
   * @returns Array of supported type names
   */
  static getSupportedTypes(): string[] {
    return Object.keys(this.TYPE_MAPPING);
  }
}
