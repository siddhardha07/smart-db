export interface QueryResult {
  columns: string[];
  rows: Record<string, string | number | boolean>[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type AppMode = "home" | "ai" | "db";

// Re-export database types for convenience
export type {
  DatabaseInfo,
  DatabaseCredentials,
  ConnectionResult,
  DatabaseSession,
} from "./database";
export { LOCAL_DB_ID } from "./database";
