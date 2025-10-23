import { Router, Request, Response } from "express";
import { SequelizeDbManager } from "../db/sequelizeDbManager";
import { DatabaseCredentials } from "../types/database";

const router = Router();

/**
 * Get all available database connections
 */
router.get("/databases", async (req: Request, res: Response) => {
  try {
    const databases = SequelizeDbManager.getAvailableDatabases();
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

    // Basic validation based on database type
    if (credentials.type === "sqlite") {
      if (!credentials.database) {
        return res.status(400).json({
          success: false,
          message: "Missing database file path for SQLite",
        });
      }
    } else {
      // PostgreSQL and MySQL validation
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
    }

    const result = await SequelizeDbManager.testConnection(credentials);

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

    // Basic validation based on database type
    if (!credentials.id || !credentials.name || !credentials.database) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: id, name, and database",
      });
    }

    if (credentials.type === "sqlite") {
      // SQLite only needs id, name, and database file path
    } else {
      // PostgreSQL and MySQL validation
      if (
        !credentials.host ||
        !credentials.port ||
        !credentials.username ||
        !credentials.password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required connection parameters for PostgreSQL/MySQL",
        });
      }
    }

    // Check if connection ID already exists
    const existingDatabases = SequelizeDbManager.getAvailableDatabases();
    if (existingDatabases.some((db) => db.id === credentials.id)) {
      return res.status(400).json({
        success: false,
        message: "Database connection with this ID already exists",
      });
    }

    const result = await SequelizeDbManager.addConnection(credentials);

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

    const success = await SequelizeDbManager.removeConnection(id);

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

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Database ID is required",
      });
    }

    // Use Sequelize's built-in schema introspection
    const schema = await SequelizeDbManager.getDatabaseSchema(id);

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
      if (!id || !tableName) {
        return res.status(400).json({
          success: false,
          message: "Database ID and table name are required",
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
      // Get all data from the table using Sequelize's universal ORM approach
      const result = await SequelizeDbManager.getTableData(id, tableName);

      res.json({
        success: true,
        data: {
          tableName,
          columns: result.columns || [],
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
