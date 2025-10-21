import { DatabaseConnection } from '../db/dbConnection';
import { DatabaseTable, CreateTableResult, TableMetadata } from '../types';
import { TypeMapper } from '../utils/typeMapper';

/**
 * Database schema manager for creating tables from Mermaid entities
 */
export class SchemaManager {
  /**
   * In-memory storage for table metadata (for Phase 1)
   * In Phase 2, this could be stored in a dedicated metadata table
   */
  private static tableMetadata: TableMetadata = { tables: [] };

  /**
   * Create tables from database table definitions
   * @param tables - Array of table definitions
   * @param dropExisting - Whether to drop existing tables first
   * @returns Result of table creation operation
   */
  static async createTables(tables: DatabaseTable[], dropExisting: boolean = false): Promise<CreateTableResult> {
    const tablesCreated: string[] = [];
    
    try {
      // Validate table and column names
      for (const table of tables) {
        if (!TypeMapper.isValidTableName(table.name)) {
          throw new Error(`Invalid table name: ${table.name}`);
        }
        
        for (const column of table.columns) {
          if (!TypeMapper.isValidColumnName(column.name)) {
            throw new Error(`Invalid column name: ${column.name} in table ${table.name}`);
          }
        }
      }

      // Create tables one by one
      for (const table of tables) {
        if (dropExisting) {
          await DatabaseConnection.dropTableIfExists(table.name);
        }

        const createTableSQL = this.generateCreateTableSQL(table);
        await DatabaseConnection.query(createTableSQL);
        
        tablesCreated.push(table.name);
      }

      // Update metadata
      this.tableMetadata.tables = tables;

      return {
        success: true,
        tablesCreated,
        metadata: this.tableMetadata
      };

    } catch (error) {
      return {
        success: false,
        tablesCreated,
        metadata: this.tableMetadata,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate CREATE TABLE SQL statement
   * @param table - Table definition
   * @returns SQL CREATE TABLE statement
   */
  private static generateCreateTableSQL(table: DatabaseTable): string {
    if (table.columns.length === 0) {
      throw new Error(`Table ${table.name} has no columns`);
    }

    const columnDefinitions = table.columns.map(column => {
      return `"${column.name}" ${column.sqlType}`;
    });

    // Add a basic primary key if no id column exists
    const hasIdColumn = table.columns.some(col => col.name.toLowerCase() === 'id');
    if (!hasIdColumn) {
      columnDefinitions.unshift('"id" SERIAL PRIMARY KEY');
    }

    const sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (
      ${columnDefinitions.join(',\n      ')}
    )`;

    return sql;
  }

  /**
   * Get current table metadata
   * @returns Current table metadata
   */
  static getMetadata(): TableMetadata {
    return { ...this.tableMetadata };
  }

  /**
   * Clear all metadata (useful for testing)
   */
  static clearMetadata(): void {
    this.tableMetadata = { tables: [] };
  }

  /**
   * Get table definition by name
   * @param tableName - Name of the table
   * @returns Table definition or undefined if not found
   */
  static getTable(tableName: string): DatabaseTable | undefined {
    return this.tableMetadata.tables.find(table => 
      table.name.toLowerCase() === tableName.toLowerCase()
    );
  }

  /**
   * Get all table names
   * @returns Array of table names
   */
  static getTableNames(): string[] {
    return this.tableMetadata.tables.map(table => table.name);
  }

  /**
   * Check if database has any tables from our metadata
   * @returns True if tables exist in metadata
   */
  static hasTables(): boolean {
    return this.tableMetadata.tables.length > 0;
  }

  /**
   * Generate a summary of all tables for AI context
   * @returns Human-readable summary of database schema
   */
  static generateSchemaSummary(): string {
    if (this.tableMetadata.tables.length === 0) {
      return 'No tables have been created yet.';
    }

    const summary = this.tableMetadata.tables.map(table => {
      const columns = table.columns.map(col => `${col.name} (${col.sqlType})`).join(', ');
      return `Table "${table.name}": ${columns}`;
    }).join('\n');

    return `Database Schema:\n${summary}`;
  }
}