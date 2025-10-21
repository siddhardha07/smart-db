import { Router, Request, Response } from 'express';
import { MermaidParser } from '../utils/mermaidParser';
import { TypeMapper } from '../utils/typeMapper';
import { SchemaManager } from '../db/schemaManager';

const router = Router();

/**
 * Request body interface for creating tables
 */
interface CreateTablesRequest {
  mermaidDiagram: string;
  dropExisting?: boolean;
}

/**
 * POST /api/schema/create-from-mermaid
 * Create PostgreSQL tables from a Mermaid ER diagram
 */
router.post('/create-from-mermaid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mermaidDiagram, dropExisting = false } = req.body as CreateTablesRequest;

    // Validate input
    if (!mermaidDiagram || typeof mermaidDiagram !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid mermaidDiagram in request body'
      });
      return;
    }

    // Validate Mermaid diagram format
    if (!MermaidParser.isValidMermaidDiagram(mermaidDiagram)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Mermaid ER diagram format. Please check your syntax.'
      });
      return;
    }

    // Parse the Mermaid diagram
    const parsedDiagram = MermaidParser.parse(mermaidDiagram);

    if (parsedDiagram.entities.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No entities found in the Mermaid diagram'
      });
      return;
    }

    // Convert entities to database table definitions
    const tables = TypeMapper.entitiesToTables(parsedDiagram.entities);

    // Create tables in database
    const result = await SchemaManager.createTables(tables, dropExisting);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: `Successfully created ${result.tablesCreated.length} table(s)`,
        tablesCreated: result.tablesCreated,
        metadata: result.metadata,
        schemaSummary: SchemaManager.generateSchemaSummary()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create tables',
        tablesCreated: result.tablesCreated
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/schema/metadata
 * Get current database schema metadata
 */
router.get('/metadata', (req: Request, res: Response): void => {
  try {
    const metadata = SchemaManager.getMetadata();

    res.json({
      success: true,
      metadata,
      tableCount: metadata.tables.length,
      tableNames: SchemaManager.getTableNames(),
      schemaSummary: SchemaManager.generateSchemaSummary()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/schema/tables/:tableName
 * Get specific table information
 */
router.get('/tables/:tableName', (req: Request, res: Response): void => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      res.status(400).json({
        success: false,
        error: 'Table name is required'
      });
      return;
    }
    
    const table = SchemaManager.getTable(tableName);

    if (!table) {
      res.status(404).json({
        success: false,
        error: `Table '${tableName}' not found`
      });
      return;
    }

    res.json({
      success: true,
      table
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/schema/clear
 * Clear all metadata (useful for development/testing)
 */
router.delete('/clear', (req: Request, res: Response): void => {
  try {
    SchemaManager.clearMetadata();

    res.json({
      success: true,
      message: 'Schema metadata cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
