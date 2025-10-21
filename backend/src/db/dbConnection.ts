import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * PostgreSQL Database Connection Manager
 * Uses a fixed connection configuration for Phase 1
 */
export class DatabaseConnection {
  private static pool: Pool | null = null;

  /**
   * Initialize the database connection pool
   */
  static initialize(): void {
    if (this.pool) {
      return; // Already initialized
    }

    // Fixed PostgreSQL connection for Phase 1
    // In Phase 2, this will be dynamic based on user input
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'smartdb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    console.log('Database connection pool initialized');
  }

  /**
   * Get a client from the pool
   */
  static async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a query with automatic client management
   */
  static async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Test the database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('Database connection test successful:', result.rows[0]?.current_time);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close all connections in the pool
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection pool closed');
    }
  }

  /**
   * Check if a table exists in the database
   */
  static async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName.toLowerCase()]
      );
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  /**
   * Drop a table if it exists (useful for cleanup during development)
   */
  static async dropTableIfExists(tableName: string): Promise<void> {
    try {
      await this.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      console.log(`Table ${tableName} dropped (if it existed)`);
    } catch (error) {
      console.error(`Error dropping table ${tableName}:`, error);
      throw error;
    }
  }
}
