// Types for AI API responses
export interface AIQueryResult {
  type: "query" | "clarification";
  query: string | null;
  explanation: string;
  confidence: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface QueryRiskAnalysis {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  operation: string;
  requiresConfirmation: boolean;
  warning: string | null;
}

export interface DatabaseSchema {
  tables: {
    name: string;
    type: string;
    estimatedRows: number;
    columns: {
      name: string;
      type: string;
      nullable: boolean;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
    }[];
  }[];
  relationships: {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }[];
  totalTables: number;
  totalColumns: number;
}

// Chat message types
export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  query?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresConfirmation?: boolean;
  confidence?: number;
}

/**
 * AI Service for interacting with backend AI endpoints
 */
export class AIService {
  private static baseUrl = "http://localhost:3001/api";

  /**
   * Generate SQL query from natural language
   */
  static async generateQuery(userInput: string): Promise<AIQueryResult> {
    console.log("Making AI request to:", `${this.baseUrl}/ai/generate-query`);
    console.log("Request payload:", { userInput });

    const response = await fetch(`${this.baseUrl}/ai/generate-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userInput }),
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response error:", errorText);
      throw new Error(
        `Failed to generate query: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Response data:", result);
    return result.data;
  }

  /**
   * Analyze query risk level
   */
  static async analyzeQuery(query: string): Promise<QueryRiskAnalysis> {
    const response = await fetch(`${this.baseUrl}/ai/analyze-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze query");
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get database schema context
   */
  static async getSchemaContext(): Promise<DatabaseSchema> {
    const response = await fetch(`${this.baseUrl}/ai/schema-context`);

    if (!response.ok) {
      throw new Error("Failed to get schema context");
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Execute a SQL query
   */
  static async executeQuery(
    query: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const response = await fetch(`${this.baseUrl}/query/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error("Failed to execute query");
    }

    return response.json();
  }
}
