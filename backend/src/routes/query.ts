import { Router, Request, Response } from "express";
import { SequelizeDbManager } from "../db/sequelizeDbManager";

const router = Router();

interface QueryRequest {
  query: string;
  databaseId: string;
  params?: any[]; // Add support for query parameters
}

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: string;
}

/**
 * Execute SQL query on specified database
 * POST /api/query
 */
router.post("/query", async (req: Request, res: Response) => {
  try {
    const { query, databaseId, params } = req.body as QueryRequest;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    if (!databaseId) {
      return res.status(400).json({
        success: false,
        message: "Database ID is required",
      });
    }

    const startTime = Date.now();

    // Execute the query with optional parameters
    const result = await SequelizeDbManager.query(
      query,
      params || [],
      databaseId
    );

    const executionTime = `${Date.now() - startTime}ms`;

    // Format the result for the frontend
    const queryResult: QueryResult = {
      columns: result.columns || [],
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      executionTime,
    };

    res.json({
      success: true,
      result: queryResult,
    });
  } catch (error) {
    console.error("Query execution error:", error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Query execution failed",
    });
  }
});

export default router;
