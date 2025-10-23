export interface QueryGenerationResult {
  type: "query" | "clarification" | "warning";
  query: string | null;
  explanation: string;
  confidence: number; // 0-1 scale
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  optimizationTips?: string[];
  alternatives?: string[];
}
