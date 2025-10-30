import {
  Database,
  ArrowLeft,
  Play,
  Save,
  FileText,
  Table,
  RotateCcw,
  Hash,
  Type,
  CheckCircle,
  Calendar,
  Brain,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";

interface DBModeProps {
  onBack: () => void;
  selectedDatabases: string[];
  initialQuery?: string | null;
  onNavigateToAIMode?: () => void;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  rowCount: number;
  executionTime: string;
}

export default function DBMode({
  onBack,
  selectedDatabases,
  initialQuery,
  onNavigateToAIMode,
}: DBModeProps) {
  // Create a ref to always have the latest selectedDatabases value
  const selectedDatabasesRef = useRef(selectedDatabases);
  selectedDatabasesRef.current = selectedDatabases;
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // SQL formatter function (same as SQLQueryDisplay component)
  const formatSQL = (sql: string) => {
    if (!sql || sql.trim() === "") return sql;

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

  const [sqlQuery, setSqlQuery] = useState(
    initialQuery
      ? formatSQL(initialQuery)
      : `-- Welcome to SmartDB AI Database Console
-- Write your SQL queries here and press Ctrl+R or click Run to execute

SELECT 'Hello, SmartDB AI!' as welcome_message;

-- Example queries:
-- SELECT * FROM information_schema.tables;
-- SHOW TABLES;
-- SELECT version();`
  );

  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const executeQuery = async () => {
    let queryToExecute = sqlQuery.trim();

    // If there's selected text in the editor, execute only the selection
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection && !selection.isEmpty()) {
        queryToExecute =
          editorRef.current.getModel()?.getValueInRange(selection) || sqlQuery;
      }
    }

    if (!queryToExecute.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`http://localhost:3001/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryToExecute,
          databaseId: selectedDatabasesRef.current[0] || "", // Use ref to get latest value
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQueryResult(data.result);
      } else {
        setError(data.message || "Query execution failed");
      }
    } catch (error) {
      console.error("Query execution failed:", error);
      setError(
        `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setQueryResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Ctrl+R shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        executeQuery();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set initial query in editor when coming from AI mode (without auto-execution)
  useEffect(() => {
    if (initialQuery) {
      // Just populate the editor, don't auto-execute
      setSqlQuery(initialQuery);
      // Focus the editor after a small delay
      const timer = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialQuery]);

  const clearEditor = () => {
    setSqlQuery("-- New query\n");
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const exportAsCSV = () => {
    if (!queryResult) return;

    const headers = queryResult.columns.join(",");
    const rows = queryResult.rows
      .map((row: Record<string, string | number | boolean | null>) =>
        queryResult.columns
          .map((col: string) => {
            const value = row[col];
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? "";
          })
          .join(",")
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    if (!queryResult) return;

    const jsonData = {
      query: sqlQuery,
      columns: queryResult.columns,
      rows: queryResult.rows,
      rowCount: queryResult.rowCount,
      executionTime: queryResult.executionTime,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsXLSX = () => {
    if (!queryResult) return;

    const worksheetData = [
      queryResult.columns,
      ...queryResult.rows.map(
        (row: Record<string, string | number | boolean | null>) =>
          queryResult.columns.map((col: string) => row[col] ?? "")
      ),
    ];

    const tsvContent = worksheetData.map((row) => row.join("\t")).join("\n");

    const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_results.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFormat = (format: "csv" | "json" | "xlsx") => {
    switch (format) {
      case "csv":
        exportAsCSV();
        break;
      case "json":
        exportAsJSON();
        break;
      case "xlsx":
        exportAsXLSX();
        break;
    }
    setShowExportMenu(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportRef.current &&
        !exportRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDataTypeIcon = (
    value: string | number | boolean | null | undefined
  ) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number")
      return <Hash className="w-3 h-3 text-blue-500" />;
    if (typeof value === "boolean")
      return <CheckCircle className="w-3 h-3 text-purple-500" />;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
      return <Calendar className="w-3 h-3 text-green-500" />;
    return <Type className="w-3 h-3 text-gray-500" />;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedRows = queryResult?.rows
    ? [...queryResult.rows].sort((a, b) => {
        if (!sortColumn) return 0;

        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        // Handle null values
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Compare values
        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      })
    : [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    });
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Define custom SQL theme with enhanced syntax highlighting
    monaco.editor.defineTheme("sqlTheme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6B7280", fontStyle: "italic" }, // Gray comments
        { token: "keyword.sql", foreground: "3B82F6", fontStyle: "bold" }, // Blue keywords (SELECT, FROM, etc.)
        { token: "string.sql", foreground: "059669" }, // Green strings
        { token: "number", foreground: "D97706" }, // Orange numbers
        { token: "identifier", foreground: "1F2937" }, // Dark gray identifiers
        { token: "operator.sql", foreground: "7C3AED" }, // Purple operators
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#1F2937",
        "editorLineNumber.foreground": "#9CA3AF",
        "editor.selectionBackground": "#DBEAFE",
        "editor.lineHighlightBackground": "#F9FAFB",
      },
    });

    // Set the custom theme
    monaco.editor.setTheme("sqlTheme");

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      executeQuery();
    });

    // Add keyboard event listener for Cmd+Enter
    editor.onKeyDown((e) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.keyCode === monaco.KeyCode.Enter) {
        e.preventDefault();
        e.stopPropagation();
        executeQuery();
      }

      // Handle Enter key for selected text execution
      if (
        e.keyCode === monaco.KeyCode.Enter &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey
      ) {
        const selection = editor.getSelection();
        // Only execute if there's a selection
        if (selection && !selection.isEmpty()) {
          // Small delay to allow suggestions to be accepted first
          setTimeout(() => {
            const newSelection = editor.getSelection();
            if (newSelection && !newSelection.isEmpty()) {
              executeQuery();
            }
          }, 10);
        }
      }
    });

    // Focus the editor
    editor.focus();
  };

  const loadExampleQuery = () => {
    setSqlQuery(`-- Get database information
SELECT
    table_name,
    table_type,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;`);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Database Console
              </h1>
              <p className="text-sm text-gray-500">
                Connected to:{" "}
                {selectedDatabases.length === 1
                  ? selectedDatabases[0]
                  : `${selectedDatabases.length} databases`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* AI Mode Button */}
          {onNavigateToAIMode && (
            <button
              onClick={onNavigateToAIMode}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Brain className="w-4 h-4" />
              <span>AI Mode</span>
            </button>
          )}

          <button
            onClick={loadExampleQuery}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Example
          </button>
          <button
            onClick={clearEditor}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={executeQuery}
            disabled={isLoading || !sqlQuery.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Ctrl+R or Cmd+Enter"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Query
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* SQL Editor */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-1/2 min-h-[300px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">SQL Editor</h3>
            </div>
          </div>
          <div className="flex-1 p-0">
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={sqlQuery}
              onChange={(value) => setSqlQuery(value || "")}
              onMount={handleEditorDidMount}
              theme="sqlTheme"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Monaco, "Cascadia Code", "Fira Code", monospace',
                lineNumbers: "on",
                renderWhitespace: "selection",
                selectOnLineNumbers: true,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: "on",
                contextmenu: true,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                  showFunctions: true,
                  showWords: true,
                },
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: false,
                },
                acceptSuggestionOnEnter: "smart",
                acceptSuggestionOnCommitCharacter: true,
                suggestOnTriggerCharacters: true,
                bracketPairColorization: {
                  enabled: true,
                },
              }}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 min-h-[300px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Query Results</h3>
              {queryResult && (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {queryResult.rowCount} row(s) • {queryResult.executionTime}
                </span>
              )}
            </div>
            {queryResult && (
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  <Save className="w-3 h-3" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                    <button
                      onClick={() => handleExportFormat("csv")}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleExportFormat("json")}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleExportFormat("xlsx")}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Export as XLSX
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {error ? (
              <div className="p-4 text-red-600 bg-red-50 border border-red-200 m-4 rounded-lg">
                <div className="font-medium mb-1">Query Error</div>
                <div className="text-sm">{error}</div>
              </div>
            ) : queryResult ? (
              <table
                className="w-full text-sm border-collapse"
                style={{ minWidth: "max-content" }}
              >
                <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
                  <tr>
                    {/* Row Number Column */}
                    <th
                      className="text-left p-3 font-medium text-gray-600 bg-gray-100 border-r border-gray-200 sticky left-0 z-20"
                      style={{ width: "4rem", minWidth: "4rem" }}
                    >
                      #
                    </th>
                    {queryResult.columns.map(
                      (column: string, index: number) => (
                        <th
                          key={index}
                          className="text-left p-3 font-medium text-gray-900 border-r border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
                          onClick={() => handleSort(column)}
                          title="Click to sort"
                          style={{ minWidth: "150px" }}
                        >
                          <div className="flex items-center gap-2">
                            {getDataTypeIcon(queryResult.rows[0]?.[column])}
                            <span>{column}</span>
                            {sortColumn === column && (
                              <span className="text-blue-500 text-xs">
                                {sortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(
                    (
                      row: Record<string, string | number | boolean | null>,
                      rowIndex: number
                    ) => (
                      <tr
                        key={rowIndex}
                        className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        {/* Row Number */}
                        <td
                          className="p-3 text-gray-500 bg-gray-50 border-r border-gray-200 font-mono text-xs sticky left-0 z-10"
                          style={{ width: "4rem", minWidth: "4rem" }}
                        >
                          {rowIndex + 1}
                        </td>
                        {queryResult.columns.map(
                          (column: string, colIndex: number) => {
                            const value = row[column];
                            let displayValue = "";
                            let cellClass =
                              "p-3 border-r border-gray-100 cursor-pointer hover:bg-blue-100 transition-colors";

                            if (value === null || value === undefined) {
                              displayValue = "NULL";
                              cellClass += " text-gray-400 italic";
                            } else if (typeof value === "number") {
                              displayValue = value.toLocaleString();
                              cellClass +=
                                " text-blue-600 font-mono text-right";
                            } else if (typeof value === "boolean") {
                              displayValue = value.toString().toUpperCase();
                              cellClass += " text-purple-600 font-medium";
                            } else {
                              displayValue = String(value);
                              cellClass += " text-gray-900";
                            }

                            return (
                              <td
                                key={colIndex}
                                className={cellClass}
                                onClick={() =>
                                  copyToClipboard(String(value || ""))
                                }
                                title={`Click to copy: ${displayValue}`}
                                style={{ minWidth: "150px", maxWidth: "400px" }}
                              >
                                <div className="truncate" title={displayValue}>
                                  {displayValue}
                                </div>
                              </td>
                            );
                          }
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Table className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">No query results yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Execute a query to see results here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
