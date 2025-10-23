export interface DatabaseCredentials {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "sqlite";
  host?: string; // Optional for SQLite
  port?: number; // Optional for SQLite
  database: string;
  username?: string; // Optional for SQLite
  password?: string; // Optional for SQLite
  isLocal?: boolean;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  connectionId?: string;
}

export interface DatabaseSession {
  id: string;
  credentials: DatabaseCredentials;
  createdAt: Date;
  lastUsed: Date;
}

export const LOCAL_DB_ID = "pg-db";
