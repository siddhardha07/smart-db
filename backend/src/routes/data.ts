import { Router, Request, Response } from "express";
import { DatabaseConnection } from "../db/dbConnection";
import { Pool } from "pg";

const router = Router();

interface InsertDataRequest {
  database: string;
  data: Record<string, Array<Record<string, any>>>;
}

interface InsertDataResponse {
  success: boolean;
  insertedRecords?: number;
  error?: string;
  details?: Array<{
    table: string;
    recordsInserted: number;
    errors?: string[];
  }>;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

/**
 * Create a database-specific connection pool
 */
function createDatabasePool(databaseName: string): Pool {
  return new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: databaseName,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

/**
 * POST /api/data/insert
 * Insert JSON data into existing database tables
 */
router.post("/insert", async (req: Request, res: Response): Promise<void> => {
  let dbPool: Pool | null = null;

  try {
    const { database, data } = req.body as InsertDataRequest;

    // Validate input
    if (!database || typeof database !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid database name",
      } as InsertDataResponse);
      return;
    }

    if (!data || typeof data !== "object") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid data object",
      } as InsertDataResponse);
      return;
    }

    // Create a connection pool for the specific database
    dbPool = createDatabasePool(database);

    // Test the connection
    try {
      await dbPool.query("SELECT 1");
    } catch (error) {
      res.status(400).json({
        success: false,
        error: `Cannot connect to database "${database}". Please check if the database exists.`,
      } as InsertDataResponse);
      return;
    }

    const details: Array<{
      table: string;
      recordsInserted: number;
      errors?: string[];
    }> = [];

    let totalInserted = 0;

    // Process each table
    for (const [tableName, records] of Object.entries(data)) {
      if (!Array.isArray(records) || records.length === 0) {
        details.push({
          table: tableName,
          recordsInserted: 0,
          errors: ["No records provided or invalid format"],
        });
        continue;
      }

      try {
        // Get table columns to validate and order data
        const columnsResult = await dbPool.query(
          `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `,
          [tableName]
        );

        if (columnsResult.rows.length === 0) {
          details.push({
            table: tableName,
            recordsInserted: 0,
            errors: [
              `Table "${tableName}" does not exist in database "${database}"`,
            ],
          });
          continue;
        }

        const columns: ColumnInfo[] = columnsResult.rows.filter(
          (col: ColumnInfo) =>
            !(
              col.column_name === "id" &&
              col.column_default?.includes("nextval")
            )
        );

        const columnNames = columns.map(
          (col: ColumnInfo) => `"${col.column_name}"`
        );
        const insertErrors: string[] = [];
        let recordsInserted = 0;

        // Insert each record
        for (const [index, record] of records.entries()) {
          try {
            // Prepare values in the correct order
            const values = columns.map((col: ColumnInfo) => {
              const value = record[col.column_name];
              return value !== undefined ? value : null;
            });

            // Create parameterized query
            const placeholders = values
              .map((_: any, i: number) => `$${i + 1}`)
              .join(", ");
            const insertQuery = `
              INSERT INTO "${tableName}" (${columnNames.join(", ")})
              VALUES (${placeholders})
            `;

            await dbPool.query(insertQuery, values);
            recordsInserted++;
            totalInserted++;
          } catch (error) {
            insertErrors.push(
              `Record ${index + 1}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }

        details.push({
          table: tableName,
          recordsInserted,
          ...(insertErrors.length > 0 && { errors: insertErrors }),
        });
      } catch (error) {
        details.push({
          table: tableName,
          recordsInserted: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }
    }

    res.json({
      success: totalInserted > 0,
      insertedRecords: totalInserted,
      details,
    } as InsertDataResponse);
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    } as InsertDataResponse);
  } finally {
    // Clean up the database pool
    if (dbPool) {
      await dbPool.end();
    }
  }
});

export default router;
