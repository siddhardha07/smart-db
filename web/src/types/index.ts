export interface QueryResult {
  columns: string[];
  rows: Record<string, string | number | boolean>[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type AppMode = 'home' | 'insert';
