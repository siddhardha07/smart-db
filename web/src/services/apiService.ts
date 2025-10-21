// API service for communicating with SmartDB AI backend

const API_BASE_URL = "http://localhost:3001";

export interface CreateTablesRequest {
  mermaidDiagram: string;
  dropExisting?: boolean;
}

export interface CreateTablesResponse {
  success: boolean;
  message: string;
  tablesCreated: string[];
  metadata: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        sqlType: string;
      }>;
    }>;
  };
  schemaSummary: string;
  error?: string;
}

export interface SchemaMetadataResponse {
  success: boolean;
  metadata: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        sqlType: string;
      }>;
    }>;
  };
  tableCount: number;
  tableNames: string[];
  schemaSummary: string;
  error?: string;
}

/**
 * Create tables from Mermaid ER diagram
 */
export async function createTablesFromMermaid(
  request: CreateTablesRequest
): Promise<CreateTablesResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/schema/create-from-mermaid`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: "",
        tablesCreated: [],
        metadata: { tables: [] },
        schemaSummary: "",
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: "",
      tablesCreated: [],
      metadata: { tables: [] },
      schemaSummary: "",
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

/**
 * Get current schema metadata
 */
export async function getSchemaMetadata(): Promise<SchemaMetadataResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schema/metadata`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        metadata: { tables: [] },
        tableCount: 0,
        tableNames: [],
        schemaSummary: "",
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      metadata: { tables: [] },
      tableCount: 0,
      tableNames: [],
      schemaSummary: "",
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export interface TableInfoResponse {
  success: boolean;
  table?: {
    name: string;
    columns: Array<{
      name: string;
      type: string;
      sqlType: string;
    }>;
  };
  error?: string;
}

/**
 * Get specific table information
 */
export async function getTableInfo(
  tableName: string
): Promise<TableInfoResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/schema/tables/${tableName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<{
  status: string;
  timestamp: string;
  service: string;
} | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Backend health check failed:", error);
    return null;
  }
}
