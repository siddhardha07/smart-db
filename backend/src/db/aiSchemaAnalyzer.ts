import { DatabaseConnection } from "../db/dbConnection";

/**
 * AI Schema Analyzer - Enhanced version of schema reading for AI context
 * Builds upon existing SchemaManager to provide AI with rich database context
 */
export class AISchemaAnalyzer {
  /**
   * Get comprehensive database schema information for AI
   */
  static async getAIContext(): Promise<AISchemaContext> {
    const tables = await this.getAllTablesWithMetadata();
    const relationships = await this.getTableRelationships();

    return {
      tables,
      relationships,
      totalTables: tables.length,
      totalColumns: tables.reduce(
        (sum, table) => sum + table.columns.length,
        0
      ),
      analysisTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all tables with detailed metadata for AI understanding
   */
  private static async getAllTablesWithMetadata(): Promise<AITableInfo[]> {
    const query = `
      WITH table_info AS (
        SELECT
          c.oid AS table_oid,
          n.nspname AS schema_name,
          c.relname AS table_name,
          CASE c.relkind
            WHEN 'r' THEN 'TABLE'
            WHEN 'v' THEN 'VIEW'
            WHEN 'm' THEN 'MATERIALIZED VIEW'
            WHEN 'f' THEN 'FOREIGN TABLE'
            ELSE c.relkind::text
          END AS table_type,
          pg_total_relation_size(c.oid) AS total_bytes,
          COALESCE(c.reltuples, 0) AS estimated_rows
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      ),
      column_info AS (
        SELECT
          table_schema AS schema_name,
          table_name,
          column_name,
          ordinal_position,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
      ),
      pk_info AS (
        SELECT
          kcu.table_schema AS schema_name,
          kcu.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ),
      fk_info AS (
        SELECT
          kcu.table_schema AS schema_name,
          kcu.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      )
      SELECT
        t.schema_name,
        t.table_name,
        t.table_type,
        t.estimated_rows,
        t.total_bytes,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        CASE WHEN pk.column_name IS NOT NULL THEN TRUE ELSE FALSE END AS is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN TRUE ELSE FALSE END AS is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name
      FROM table_info t
      JOIN column_info c
        ON t.schema_name = c.schema_name AND t.table_name = c.table_name
      LEFT JOIN pk_info pk
        ON pk.schema_name = c.schema_name AND pk.table_name = c.table_name AND pk.column_name = c.column_name
      LEFT JOIN fk_info fk
        ON fk.schema_name = c.schema_name AND fk.table_name = c.table_name AND fk.column_name = c.column_name
      WHERE t.schema_name = 'public'
      ORDER BY t.schema_name, t.table_name, c.ordinal_position;
    `;

    const result = await DatabaseConnection.query(query);
    return this.groupTableResults(result.rows);
  }

  /**
   * Group database results by table
   */
  private static groupTableResults(rows: any[]): AITableInfo[] {
    const tablesMap = new Map<string, AITableInfo>();

    for (const row of rows) {
      if (!tablesMap.has(row.table_name)) {
        tablesMap.set(row.table_name, {
          name: row.table_name,
          type: row.table_type,
          estimatedRows: parseInt(row.estimated_rows) || 0,
          totalBytes: parseInt(row.total_bytes) || 0,
          schema: row.schema_name,
          columns: [],
          indexes: [],
          sampleData: [],
        });
      }

      const table = tablesMap.get(row.table_name)!;

      if (row.column_name) {
        table.columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === "YES",
          isPrimaryKey: row.is_primary_key,
          isForeignKey: row.is_foreign_key,
          defaultValue: row.column_default,
          foreignTable: row.foreign_table_name,
          foreignColumn: row.foreign_column_name,
          ordinalPosition: row.ordinal_position,
        });
      }
    }

    return Array.from(tablesMap.values());
  }

  /**
   * Get sample data from tables (first 3 rows) for AI context
   */
  static async getSampleData(tableName: string): Promise<any[]> {
    try {
      const query = `SELECT * FROM ${tableName} LIMIT 3`;
      const result = await DatabaseConnection.query(query);
      return result.rows;
    } catch (error) {
      console.warn(`Could not get sample data for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Get table relationships for AI understanding
   */
  private static async getTableRelationships(): Promise<AITableRelationship[]> {
    const query = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `;

    const result = await DatabaseConnection.query(query);
    return result.rows.map((row: any) => ({
      fromTable: row.table_name,
      fromColumn: row.column_name,
      toTable: row.foreign_table_name,
      toColumn: row.foreign_column_name,
      constraintName: row.constraint_name,
    }));
  }

  /**
   * Analyze query risk level for AI safety
   */
  static analyzeQueryRisk(sql: string): QueryRiskAnalysis {
    const upperSQL = sql.toUpperCase().trim();

    // Critical operations
    if (upperSQL.includes("DROP TABLE") || upperSQL.includes("DROP DATABASE")) {
      return {
        level: "CRITICAL",
        operation: "DROP",
        requiresConfirmation: true,
        warning:
          "This operation will permanently delete data and cannot be undone!",
      };
    }

    // High risk operations
    if (upperSQL.includes("DELETE FROM") && !upperSQL.includes("WHERE")) {
      return {
        level: "HIGH",
        operation: "DELETE",
        requiresConfirmation: true,
        warning:
          "DELETE without WHERE clause will remove ALL rows from the table!",
      };
    }

    if (upperSQL.includes("UPDATE") && !upperSQL.includes("WHERE")) {
      return {
        level: "HIGH",
        operation: "UPDATE",
        requiresConfirmation: true,
        warning:
          "UPDATE without WHERE clause will modify ALL rows in the table!",
      };
    }

    // Medium risk operations
    if (
      upperSQL.includes("DELETE FROM") ||
      upperSQL.includes("UPDATE") ||
      upperSQL.includes("INSERT INTO")
    ) {
      return {
        level: "MEDIUM",
        operation: upperSQL.includes("DELETE")
          ? "DELETE"
          : upperSQL.includes("UPDATE")
          ? "UPDATE"
          : "INSERT",
        requiresConfirmation: false,
        warning: "This operation will modify data in your database.",
      };
    }

    // Low risk - SELECT queries
    return {
      level: "LOW",
      operation: "SELECT",
      requiresConfirmation: false,
      warning: null,
    };
  }
}

// Types for AI Schema Context
export interface AISchemaContext {
  tables: AITableInfo[];
  relationships: AITableRelationship[];
  totalTables: number;
  totalColumns: number;
  analysisTimestamp: string;
}

export interface AITableInfo {
  name: string;
  type: string;
  estimatedRows: number;
  totalBytes?: number;
  schema?: string;
  columns: AIColumnInfo[];
  indexes: string[];
  sampleData: any[];
}

export interface AIColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
  foreignTable?: string;
  foreignColumn?: string;
  ordinalPosition?: number;
}

export interface AITableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
}

export interface QueryRiskAnalysis {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  operation: string;
  requiresConfirmation: boolean;
  warning: string | null;
}
