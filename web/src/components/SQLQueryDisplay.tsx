import React from "react";
import { Copy, Play } from "lucide-react";

interface SQLQueryDisplayProps {
  query: string;
  onCopy: () => void;
  onExecute: () => void;
  isLoading?: boolean;
  showExecuteButton?: boolean;
}

export const SQLQueryDisplay: React.FC<SQLQueryDisplayProps> = ({
  query,
  onCopy,
  onExecute,
  isLoading = false,
  showExecuteButton = true,
}) => {
  // Simple SQL formatter
  const formatSQL = (sql: string) => {
    // Basic SQL formatting - add line breaks for better readability
    const formatted = sql
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/,\s*/g, ",\n    ") // New line after commas with indentation
      .replace(/\bFROM\b/gi, "\nFROM")
      .replace(/\bWHERE\b/gi, "\nWHERE")
      .replace(/\bJOIN\b/gi, "\nJOIN")
      .replace(/\bINNER JOIN\b/gi, "\nINNER JOIN")
      .replace(/\bLEFT JOIN\b/gi, "\nLEFT JOIN")
      .replace(/\bRIGHT JOIN\b/gi, "\nRIGHT JOIN")
      .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
      .replace(/\bORDER BY\b/gi, "\nORDER BY")
      .replace(/\bHAVING\b/gi, "\nHAVING")
      .replace(/\bLIMIT\b/gi, "\nLIMIT")
      .replace(/\bON\b/gi, "\n    ON")
      .replace(/\bAND\b/gi, "\n    AND")
      .replace(/\bOR\b/gi, "\n    OR")
      .trim();

    return formatted;
  };

  // Simple SQL syntax highlighting
  const highlightSQL = (sql: string) => {
    // First format the SQL
    const formattedSQL = formatSQL(sql);
    const keywords = [
      "SELECT",
      "FROM",
      "WHERE",
      "JOIN",
      "INNER JOIN",
      "LEFT JOIN",
      "RIGHT JOIN",
      "GROUP BY",
      "ORDER BY",
      "HAVING",
      "LIMIT",
      "AS",
      "ON",
      "AND",
      "OR",
      "NOT",
      "COUNT",
      "SUM",
      "AVG",
      "MAX",
      "MIN",
      "DISTINCT",
      "CASE",
      "WHEN",
      "THEN",
      "ELSE",
      "END",
      "LOWER",
      "UPPER",
      "DESC",
      "ASC",
    ];

    let highlighted = formattedSQL;

    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      highlighted = highlighted.replace(
        regex,
        `<span class="sql-keyword">${keyword}</span>`
      );
    });

    // Highlight strings
    highlighted = highlighted.replace(
      /'([^']*)'/g,
      "<span class=\"sql-string\">'$1'</span>"
    );

    // Highlight numbers
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span class="sql-number">$1</span>'
    );

    return highlighted;
  };

  return (
    <div className="mt-3 bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-300">SQL Query</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>

          {showExecuteButton && (
            <button
              onClick={onExecute}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Play className="w-3 h-3" />
              {isLoading ? "Running..." : "Run Query"}
            </button>
          )}
        </div>
      </div>

      {/* SQL Code */}
      <div className="p-3">
        <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
          <code
            dangerouslySetInnerHTML={{ __html: highlightSQL(query) }}
            className="sql-code"
          />
        </pre>
      </div>

      <style>
        {`
          .sql-code .sql-keyword {
            color: #8b5cf6; /* Purple for keywords */
            font-weight: 600;
          }
          .sql-code .sql-string {
            color: #10b981; /* Green for strings */
          }
          .sql-code .sql-number {
            color: #f59e0b; /* Orange for numbers */
          }
        `}
      </style>
    </div>
  );
};
