import { Pool, PoolClient } from "pg";
import * as dotenv from "dotenv";
import {
  DatabaseCredentials,
  ConnectionResult,
  DatabaseSession,
  LOCAL_DB_ID,
} from "../types/database";

// Load environment variables
dotenv.config();

/**
 * Multi-Database Connection Manager
 * Supports both local PostgreSQL and user-provided databases
 */
export class MultiDatabaseManager {
  private static connections = new Map<string, Pool>();
  private static sessions = new Map<string, DatabaseSession>();
  private static localPool: Pool | null = null;

  /**
   * Initialize the local PostgreSQL database
   */
  static initializeLocalDatabase(): void {
    if (this.localPool) {
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

    this.localPool = new Pool({
      host: localCredentials.host,
      port: localCredentials.port,
      database: localCredentials.database,
      user: localCredentials.username,
      password: localCredentials.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.localPool.on("error", (err) => {
      console.error("Unexpected error on local database client", err);
    });

    // Store local connection
    this.connections.set(LOCAL_DB_ID, this.localPool);

    // Create local session
    this.sessions.set(LOCAL_DB_ID, {
      id: LOCAL_DB_ID,
      credentials: localCredentials,
      createdAt: new Date(),
      lastUsed: new Date(),
    });

    console.log("Local PostgreSQL database initialized");
  }

  /**
   * Test a database connection with given credentials
   */
  static async testConnection(
    credentials: DatabaseCredentials
  ): Promise<ConnectionResult> {
    let testPool: Pool | null = null;

    try {
      // Create a temporary pool for testing
      testPool = new Pool({
        host: credentials.host,
        port: credentials.port,
        database: credentials.database,
        user: credentials.username,
        password: credentials.password,
        max: 1, // Only one connection for testing
        connectionTimeoutMillis: 5000, // 5 seconds timeout for testing
      });

      // Try to connect and run a simple query
      const client = await testPool.connect();
      await client.query("SELECT 1");
      client.release();

      return {
        success: true,
        message: `Successfully connected to ${credentials.database}`,
        connectionId: credentials.id,
      };
    } catch (error: any) {
      console.error("Connection test failed:", error);

      return {
        success: false,
        message: this.getErrorMessage(error),
      };
    } finally {
      // Clean up test pool
      if (testPool) {
        try {
          await testPool.end();
        } catch (cleanupError) {
          console.error("Error cleaning up test pool:", cleanupError);
        }
      }
    }
  }

  /**
   * Add a new database connection
   */
  static async addConnection(
    credentials: DatabaseCredentials
  ): Promise<ConnectionResult> {
    try {
      // First test the connection
      const testResult = await this.testConnection(credentials);
      if (!testResult.success) {
        return testResult;
      }

      // Create the pool
      const pool = new Pool({
        host: credentials.host,
        port: credentials.port,
        database: credentials.database,
        user: credentials.username,
        password: credentials.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Handle pool errors
      pool.on("error", (err) => {
        console.error(
          `Unexpected error on database client ${credentials.id}:`,
          err
        );
      });

      // Store connection and session
      this.connections.set(credentials.id, pool);
      this.sessions.set(credentials.id, {
        id: credentials.id,
        credentials: credentials,
        createdAt: new Date(),
        lastUsed: new Date(),
      });

      console.log(`Database connection added: ${credentials.name}`);

      return {
        success: true,
        message: `Connected to ${credentials.name}`,
        connectionId: credentials.id,
      };
    } catch (error: any) {
      console.error("Error adding connection:", error);
      return {
        success: false,
        message: `Failed to add connection: ${this.getErrorMessage(error)}`,
      };
    }
  }

  /**
   * Get a client from a specific database connection
   */
  static async getClient(
    connectionId: string = LOCAL_DB_ID
  ): Promise<PoolClient> {
    const pool = this.connections.get(connectionId);

    if (!pool) {
      throw new Error(
        `Database connection '${connectionId}' not found. Available connections: ${Array.from(
          this.connections.keys()
        ).join(", ")}`
      );
    }

    try {
      const client = await pool.connect();

      // Update last used time
      const session = this.sessions.get(connectionId);
      if (session) {
        session.lastUsed = new Date();
      }

      return client;
    } catch (error) {
      throw new Error(
        `Failed to connect to database '${connectionId}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Execute a query on a specific database
   */
  static async query(
    text: string,
    params?: any[],
    connectionId: string = LOCAL_DB_ID
  ): Promise<any> {
    const client = await this.getClient(connectionId);

    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Get all available database sessions
   */
  static getAvailableDatabases(): DatabaseSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Remove a database connection
   */
  static async removeConnection(connectionId: string): Promise<boolean> {
    if (connectionId === LOCAL_DB_ID) {
      throw new Error("Cannot remove local database connection");
    }

    const pool = this.connections.get(connectionId);
    if (pool) {
      try {
        await pool.end();
        this.connections.delete(connectionId);
        this.sessions.delete(connectionId);
        console.log(`Database connection removed: ${connectionId}`);
        return true;
      } catch (error) {
        console.error(`Error removing connection ${connectionId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Close all connections
   */
  static async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.entries()).map(
      async ([id, pool]) => {
        try {
          await pool.end();
          console.log(`Closed connection: ${id}`);
        } catch (error) {
          console.error(`Error closing connection ${id}:`, error);
        }
      }
    );

    await Promise.all(closePromises);

    this.connections.clear();
    this.sessions.clear();
    this.localPool = null;

    console.log("All database connections closed");
  }

  /**
   * Check if a table exists in a specific database
   */
  static async tableExists(
    tableName: string,
    connectionId: string = LOCAL_DB_ID
  ): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [tableName.toLowerCase()],
        connectionId
      );
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error(
        `Error checking if table ${tableName} exists in ${connectionId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Convert database error to user-friendly message
   */
  private static getErrorMessage(error: any): string {
    if (error.code === "28P01") {
      return "Authentication failed. Please check your username and password.";
    }
    if (error.code === "3D000") {
      return "Database not found. Please check the database name.";
    }
    if (error.code === "ENOTFOUND") {
      return "Host not found. Please check the host address.";
    }
    if (error.code === "ECONNREFUSED") {
      return "Connection refused. Please check the host and port.";
    }
    if (error.code === "ECONNRESET") {
      return "Connection reset. The database server may be unavailable.";
    }
    if (error.code === "ETIMEDOUT") {
      return "Connection timeout. Please check your network connection.";
    }

    // Generic error message
    return error.message || "Unknown connection error occurred.";
  }
}
