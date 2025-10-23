import { Sequelize, QueryTypes } from "sequelize";
import * as dotenv from "dotenv";
import {
  DatabaseCredentials,
  ConnectionResult,
  DatabaseSession,
  LOCAL_DB_ID,
} from "../types/database";

// Load environment variables
dotenv.config();

interface SequelizeConnection {
  sequelize: Sequelize;
  credentials: DatabaseCredentials;
}

interface QueryResult {
  rows: any[];
  fields?: any[];
  columns?: string[];
  rowCount?: number;
}

/**
 * Sequelize-based Multi-Database Connection Manager
 * Provides database abstraction using Sequelize ORM
 * Supports PostgreSQL, MySQL, SQLite, and other Sequelize-compatible databases
 */
export class SequelizeDbManager {
  private static connections = new Map<string, SequelizeConnection>();
  private static sessions = new Map<string, DatabaseSession>();
  private static localConnection: SequelizeConnection | null = null;

  /**
   * Initialize the local PostgreSQL database
   */
  static initializeLocalDatabase(): void {
    if (this.localConnection) {
      return; // Already initialized
    }

    const localCredentials: DatabaseCredentials = {
      id: LOCAL_DB_ID,
      name: "pg-db (Local)",
      type: "postgresql",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "smartdb",
      username: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "password",
      isLocal: true,
    };

    const sequelize = new Sequelize({
      dialect: "postgres",
      host: localCredentials.host!,
      port: localCredentials.port!,
      database: localCredentials.database,
      username: localCredentials.username!,
      password: localCredentials.password!,
      logging: false, // Disable SQL logging for cleaner output
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    this.localConnection = {
      sequelize,
      credentials: localCredentials,
    };

    // Store local connection
    this.connections.set(LOCAL_DB_ID, this.localConnection);
    this.sessions.set(LOCAL_DB_ID, {
      id: LOCAL_DB_ID,
      credentials: localCredentials,
      createdAt: new Date(),
      lastUsed: new Date(),
    });

    console.log("✅ Local PostgreSQL database initialized with Sequelize");
  }

  /**
   * Create Sequelize instance based on database credentials
   */
  private static createSequelizeInstance(credentials: DatabaseCredentials): Sequelize {
    const baseConfig = {
      logging: false,
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };

    switch (credentials.type) {
      case "postgresql":
        return new Sequelize({
          dialect: "postgres",
          host: credentials.host!,
          port: credentials.port!,
          database: credentials.database,
          username: credentials.username!,
          password: credentials.password!,
          ...baseConfig,
        });

      case "mysql":
        return new Sequelize({
          dialect: "mysql",
          host: credentials.host!,
          port: credentials.port!,
          database: credentials.database,
          username: credentials.username!,
          password: credentials.password!,
          dialectOptions: {
            multipleStatements: true, // Allow multiple statements
          },
          ...baseConfig,
        });

      case "sqlite":
        return new Sequelize({
          dialect: "sqlite",
          storage: credentials.database, // For SQLite, database field contains file path
          ...baseConfig,
        });

      default:
        throw new Error(`Unsupported database type: ${credentials.type}`);
    }
  }

  /**
   * Test database connection for any supported database type
   */
  static async testConnection(credentials: DatabaseCredentials): Promise<ConnectionResult> {
    let testSequelize: Sequelize | null = null;

    try {
      testSequelize = this.createSequelizeInstance(credentials);
      
      // Test the connection
      await testSequelize.authenticate();

      return {
        success: true,
        message: `Successfully connected to ${credentials.type.toUpperCase()} database: ${credentials.database}`,
        connectionId: credentials.id,
      };
    } catch (error: any) {
      console.error("Connection test failed:", error);
      return {
        success: false,
        message: this.getErrorMessage(error),
      };
    } finally {
      if (testSequelize) {
        await testSequelize.close();
      }
    }
  }

  /**
   * Add a new database connection
   */
  static async addConnection(credentials: DatabaseCredentials): Promise<ConnectionResult> {
    try {
      // First test the connection
      const testResult = await this.testConnection(credentials);
      if (!testResult.success) {
        return testResult;
      }

      // Create the Sequelize instance
      const sequelize = this.createSequelizeInstance(credentials);

      // Test the connection one more time to ensure it's working
      await sequelize.authenticate();

      const connection: SequelizeConnection = {
        sequelize,
        credentials,
      };

      // Store connection and session
      this.connections.set(credentials.id, connection);
      this.sessions.set(credentials.id, {
        id: credentials.id,
        credentials,
        createdAt: new Date(),
        lastUsed: new Date(),
      });

      console.log(`✅ Added ${credentials.type.toUpperCase()} connection: ${credentials.id}`);

      return {
        success: true,
        message: `Connected to ${credentials.name}`,
        connectionId: credentials.id,
      };
    } catch (error: any) {
      console.error("Error adding database connection:", error);
      return {
        success: false,
        message: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get table data using Sequelize's universal approach
   */
  static async getTableData(databaseId: string, tableName: string): Promise<QueryResult> {
    const connection = this.connections.get(databaseId);
    if (!connection) {
      throw new Error(`Database connection not found: ${databaseId}`);
    }

    try {
      // Use Sequelize's universal query method - it handles database-specific syntax internally
      const result = await connection.sequelize.query(
        `SELECT * FROM ${tableName}`,
        {
          type: QueryTypes.SELECT,
          raw: true,
        }
      );

      const rows = result as any[];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        rows: rows,
        rowCount: rows.length,
        columns: columns,
      };
    } catch (error: any) {
      throw new Error(`Failed to get table data: ${error.message}`);
    }
  }

  /**
   * Execute query on any database type using Sequelize
   */
  static async query(
    sql: string,
    params: any[] = [],
    databaseId: string = LOCAL_DB_ID
  ): Promise<QueryResult> {
    const connection = this.connections.get(databaseId);
    if (!connection) {
      throw new Error(`Database connection not found: ${databaseId}`);
    }

    // Update last used time
    const session = this.sessions.get(databaseId);
    if (session) {
      session.lastUsed = new Date();
    }

    try {
      // Use Sequelize's query method which handles all database types
      const result = await connection.sequelize.query(sql, {
        replacements: params,
        type: QueryTypes.SELECT,
        raw: true,
      });

      // Extract column names from the first row
      const rows = result as any[];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        rows: rows,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        columns: columns,
      };
    } catch (error: any) {
      // For non-SELECT queries, try again without QueryTypes.SELECT
      try {
        const result = await connection.sequelize.query(sql, {
          replacements: params,
          raw: true,
        });

        // Result format: [results, metadata]
        const [results, metadata] = result as [any[], any];
        const resultRows = Array.isArray(results) ? results : [];
        const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
        
        return {
          rows: resultRows,
          rowCount: metadata?.affectedRows || resultRows?.length || 0,
          columns: columns,
        };
      } catch (secondError: any) {
        throw new Error(`Query execution failed: ${secondError.message}`);
      }
    }
  }

  /**
   * Get database schema using Sequelize's built-in introspection
   */
  static async getDatabaseSchema(databaseId: string): Promise<any[]> {
    const connection = this.connections.get(databaseId);
    if (!connection) {
      throw new Error(`Database connection not found: ${databaseId}`);
    }

    try {
      const queryInterface = connection.sequelize.getQueryInterface();
      
      // Get all table names
      const tableNames = await queryInterface.showAllTables();
      
      const schema = [];
      
      for (const tableName of tableNames) {
        try {
          // Get table description (columns info)
          const tableDescription = await queryInterface.describeTable(tableName);
          
          // Convert Sequelize format to our expected format
          const columns = Object.entries(tableDescription).map(([columnName, columnInfo]: [string, any]) => ({
            column_name: columnName,
            data_type: columnInfo.type,
            is_nullable: columnInfo.allowNull ? 'YES' : 'NO',
            column_default: columnInfo.defaultValue,
          }));

          schema.push({
            tableName,
            columns,
          });
        } catch (tableError) {
          console.warn(`Could not describe table ${tableName}:`, tableError);
          // Skip this table if we can't describe it
        }
      }

      return schema;
    } catch (error: any) {
      throw new Error(`Schema introspection failed: ${error.message}`);
    }
  }

  /**
   * Get all available database sessions
   */
  static getAvailableDatabases(): DatabaseSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Remove database connection
   */
  static async removeConnection(databaseId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(databaseId);
      if (!connection) {
        return false;
      }

      // Close Sequelize connection
      await connection.sequelize.close();

      // Remove from maps
      this.connections.delete(databaseId);
      this.sessions.delete(databaseId);

      console.log(`✅ Removed database connection: ${databaseId}`);
      return true;
    } catch (error) {
      console.error(`Error removing database connection ${databaseId}:`, error);
      return false;
    }
  }

  /**
   * Close all database connections
   */
  static async closeAllConnections(): Promise<void> {
    const connectionIds = Array.from(this.connections.keys());
    
    for (const connectionId of connectionIds) {
      try {
        await this.removeConnection(connectionId);
      } catch (error) {
        console.error(`Error closing connection ${connectionId}:`, error);
      }
    }
    
    console.log("✅ All database connections closed");
  }

  /**
   * Get error message from error object
   */
  private static getErrorMessage(error: any): string {
    if (error?.name === "SequelizeConnectionRefusedError") {
      return "Connection refused. Please check if the database server is running and accessible.";
    }
    if (error?.name === "SequelizeHostNotFoundError") {
      return "Host not found. Please check the hostname/IP address.";
    }
    if (error?.name === "SequelizeConnectionTimedOutError") {
      return "Connection timed out. Please check your network settings.";
    }
    if (error?.name === "SequelizeAccessDeniedError") {
      return "Authentication failed. Please check your username and password.";
    }
    if (error?.name === "SequelizeDatabaseError") {
      if (error?.message?.includes("does not exist")) {
        return "Database does not exist. Please check the database name.";
      }
      if (error?.message?.includes("role") && error?.message?.includes("does not exist")) {
        return "User/role does not exist. Please check the username.";
      }
    }

    return error?.message || "Unknown database error occurred";
  }
}