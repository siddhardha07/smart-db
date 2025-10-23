import { Router, Request, Response } from "express";
import { MultiDatabaseManager } from "../db/multiDatabaseManager";
import { DatabaseCredentials } from "../types/database";

const router = Router();

/**
 * Get all available database connections
 */
router.get("/databases", async (req: Request, res: Response) => {
  try {
    const databases = MultiDatabaseManager.getAvailableDatabases();
    res.json({
      success: true,
      databases: databases.map((db) => ({
        id: db.id,
        name: db.credentials.name,
        type: db.credentials.type,
        host: db.credentials.host,
        port: db.credentials.port,
        database: db.credentials.database,
        isLocal: db.credentials.isLocal,
        lastUsed: db.lastUsed,
      })),
    });
  } catch (error) {
    console.error("Error getting databases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get database list",
    });
  }
});

/**
 * Test database connection
 */
router.post("/databases/test", async (req: Request, res: Response) => {
  try {
    const credentials: DatabaseCredentials = req.body;

    // Basic validation
    if (
      !credentials.host ||
      !credentials.port ||
      !credentials.database ||
      !credentials.username ||
      !credentials.password
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required connection parameters",
      });
    }

    const result = await MultiDatabaseManager.testConnection(credentials);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error testing connection:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during connection test",
    });
  }
});

/**
 * Add new database connection
 */
router.post("/databases", async (req: Request, res: Response) => {
  try {
    const credentials: DatabaseCredentials = req.body;

    // Basic validation
    if (
      !credentials.id ||
      !credentials.name ||
      !credentials.host ||
      !credentials.port ||
      !credentials.database ||
      !credentials.username ||
      !credentials.password
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required connection parameters",
      });
    }

    // Check if connection ID already exists
    const existingDatabases = MultiDatabaseManager.getAvailableDatabases();
    if (existingDatabases.some((db) => db.id === credentials.id)) {
      return res.status(400).json({
        success: false,
        message: "Database connection with this ID already exists",
      });
    }

    const result = await MultiDatabaseManager.addConnection(credentials);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error adding database connection:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while adding database connection",
    });
  }
});

/**
 * Remove database connection
 */
router.delete("/databases/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Database ID is required",
      });
    }

    const success = await MultiDatabaseManager.removeConnection(id);

    if (success) {
      res.json({
        success: true,
        message: `Database connection '${id}' removed successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Database connection '${id}' not found`,
      });
    }
  } catch (error) {
    console.error("Error removing database connection:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to remove database connection",
    });
  }
});

/**
 * Get schema for a specific database
 */
router.get("/databases/:id/schema", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get all tables in the database
    const tablesResult = await MultiDatabaseManager.query(
      `SELECT table_name, table_schema
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`,
      [],
      id
    );

    const schema = [];

    for (const table of tablesResult.rows) {
      // Get columns for each table
      const columnsResult = await MultiDatabaseManager.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table.table_name],
        id
      );

      schema.push({
        tableName: table.table_name,
        columns: columnsResult.rows,
      });
    }

    res.json({
      success: true,
      schema: schema,
    });
  } catch (error) {
    console.error("Error getting database schema:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get database schema",
    });
  }
});

/**
 * Get data from a specific table
 */
router.get(
  "/databases/:id/tables/:tableName/data",
  async (req: Request, res: Response) => {
    try {
      const { id, tableName } = req.params;

      // Validate required parameters
      if (!tableName) {
        return res.status(400).json({
          success: false,
          message: "Table name is required",
        });
      }

      // Security: Validate table name to prevent SQL injection
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return res.status(400).json({
          success: false,
          message: "Invalid table name",
        });
      }

      // WARNING: No limit applied - could cause memory issues with large tables
      // Get all data from the table
      const result = await MultiDatabaseManager.query(
        `SELECT * FROM "${tableName}"`,
        [],
        id
      );

      res.json({
        success: true,
        data: {
          tableName,
          columns: result.fields
            ? result.fields.map((field: any) => field.name)
            : [],
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          totalRows: result.rowCount || 0,
        },
      });
    } catch (error) {
      console.error("Error getting table data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get table data",
      });
    }
  }
);

export default router;
