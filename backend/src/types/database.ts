export interface DatabaseCredentials {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "sqlite";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
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
