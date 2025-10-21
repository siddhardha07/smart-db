// Types for Mermaid ER diagram parsing and database operations

export interface MermaidAttribute {
  name: string;
  type: string;
}

export interface MermaidEntity {
  name: string;
  attributes: MermaidAttribute[];
}

export interface ParsedDiagram {
  entities: MermaidEntity[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  sqlType: string;
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
}

export interface TableMetadata {
  tables: DatabaseTable[];
}

export interface CreateTableResult {
  success: boolean;
  tablesCreated: string[];
  metadata: TableMetadata;
  error?: string;
}