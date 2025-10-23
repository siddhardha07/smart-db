import React, { useState, useRef } from "react";
import {
  X,
  Database,
  Upload,
  FileText,
  AlertCircle,
  Table,
} from "lucide-react";

interface InsertDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDatabase: string;
}

const InsertDataModal: React.FC<InsertDataModalProps> = ({
  isOpen,
  onClose,
  selectedDatabase,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [mermaidText, setMermaidText] = useState("");
  const [showTablesModal, setShowTablesModal] = useState(false);
  const [showManualInsertModal, setShowManualInsertModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [manualData, setManualData] = useState<
    Record<string, string | number | boolean | null>
  >({});
  const [tables, setTables] = useState<
    {
      tableName: string;
      columns: {
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }[];
    }[]
  >([]);

  const loadTablesData = async () => {
    if (!selectedDatabase) {
      setError("No database selected");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `http://localhost:3001/api/databases/${selectedDatabase}/schema`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setTables(data.schema);
        return true;
      } else {
        setError(data.message || "Failed to load tables");
        return false;
      }
    } catch (error) {
      console.error("Error loading tables:", error);
      setError("Failed to connect to server");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    const success = await loadTablesData();
    if (success) {
      setShowTablesModal(true);
    }
  };
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [isOpen, selectedDatabase]);

  const parseCSV = (csvText: string): Record<string, unknown>[] => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      if (values.length !== headers.length) {
        throw new Error(
          `Row ${i + 1} has ${values.length} columns, expected ${
            headers.length
          }`
        );
      }

      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        // Try to parse as number, boolean, or keep as string
        if (value === "null" || value === "") {
          row[header] = null;
        } else if (value === "true") {
          row[header] = true;
        } else if (value === "false") {
          row[header] = false;
        } else if (!isNaN(Number(value)) && value !== "") {
          row[header] = Number(value);
        } else {
          row[header] = value;
        }
      });
      rows.push(row);
    }

    return rows;
  };

  const handleCSVUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      // Extract table name from filename (remove .csv extension)
      const tableName = file.name.replace(/\.csv$/i, "").toLowerCase();

      // Prepare data in the format expected by the API
      const data = { [tableName]: rows };

      // Send to backend
      const response = await fetch("http://localhost:3001/api/data/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseId: selectedDatabase,
          data: data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(
          `Successfully inserted ${result.insertedRecords} records into ${tableName} table`
        );
      } else {
        setError(result.error || "Failed to insert data");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process CSV file"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJSONUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Send to backend
      const response = await fetch("http://localhost:3001/api/data/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseId: selectedDatabase,
          data: jsonData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully inserted ${result.insertedRecords} records`);
      } else {
        setError(result.error || "Failed to insert data");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process JSON file"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (type: "csv" | "json") => {
    if (type === "csv") {
      csvInputRef.current?.click();
    } else {
      jsonInputRef.current?.click();
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "csv" | "json"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === "csv") {
        handleCSVUpload(file);
      } else {
        handleJSONUpload(file);
      }
    }
    // Reset the input so the same file can be selected again
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleMermaidSubmit = async () => {
    if (!mermaidText.trim()) {
      setError("Please enter a Mermaid diagram");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "http://localhost:3001/api/schema/create-from-mermaid",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mermaidDiagram: mermaidText,
            dropExisting: false,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully created ${result.tablesCreated} tables`);
        setShowMermaidModal(false);
        setMermaidText("");
      } else {
        setError(
          result.error || "Failed to create tables from Mermaid diagram"
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process Mermaid diagram"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualInsert = async () => {
    if (!selectedTable) {
      setError("Please select a table");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("http://localhost:3001/api/data/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseId: selectedDatabase,
          data: { [selectedTable]: [manualData] },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(
          `Successfully inserted 1 record into ${selectedTable} table`
        );
        setShowManualInsertModal(false);
        setManualData({});
        setSelectedTable("");
      } else {
        setError(result.error || "Failed to insert data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to insert data");
    } finally {
      setLoading(false);
    }
  };

  const openManualInsert = async () => {
    const success = await loadTablesData();
    if (success) {
      setShowManualInsertModal(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Insert Data
              </h2>
              <p className="text-sm text-gray-500">
                Connected to: {selectedDatabase}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 140px)" }}
        >
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium">Success</p>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, "csv")}
            style={{ display: "none" }}
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={(e) => handleFileChange(e, "json")}
            style={{ display: "none" }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upload CSV */}
            <div
              className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group"
              onClick={() => handleFileSelect("csv")}
            >
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload CSV File
                </h3>
                <p className="text-gray-600 mb-4">
                  Drop your CSV file here or click to browse. We'll
                  automatically detect columns and data types.
                </p>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white`}
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileSelect("csv");
                  }}
                >
                  {loading ? "Uploading..." : "Choose File"}
                </button>
              </div>
            </div>

            {/* Create from Mermaid */}
            <div
              className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer group"
              onClick={() => setShowMermaidModal(true)}
            >
              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <Database className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Create from Mermaid
                </h3>
                <p className="text-gray-600 mb-4">
                  Paste your Mermaid ER diagram and we'll create tables with
                  proper relationships and constraints.
                </p>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  } text-white`}
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMermaidModal(true);
                  }}
                >
                  {loading ? "Creating..." : "Create Tables"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              onClick={loadTables}
              disabled={loading}
            >
              <div className="text-sm font-medium text-gray-900">
                View Tables
              </div>
              <div className="text-xs text-gray-500">
                See existing table structure
              </div>
            </button>

            <button
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              onClick={openManualInsert}
              disabled={loading}
            >
              <div className="text-sm font-medium text-gray-900">
                Manual Insert
              </div>
              <div className="text-xs text-gray-500">Add data row by row</div>
            </button>

            <button
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
              onClick={() => handleFileSelect("json")}
              disabled={loading}
            >
              <div className="text-sm font-medium text-gray-900">
                Import JSON
              </div>
              <div className="text-xs text-gray-500">
                Upload JSON data files
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mermaid Modal */}
      {showMermaidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Create Tables from Mermaid Diagram
              </h3>
              <button
                onClick={() => {
                  setShowMermaidModal(false);
                  setMermaidText("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mermaid ER Diagram
                </label>
                <textarea
                  value={mermaidText}
                  onChange={(e) => setMermaidText(e.target.value)}
                  placeholder={`erDiagram
    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        int customer_id FK
        date order_date
    }
    CUSTOMER ||--o{ ORDER : places`}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowMermaidModal(false);
                    setMermaidText("");
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMermaidSubmit}
                  disabled={loading || !mermaidText.trim()}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    loading || !mermaidText.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  } text-white`}
                >
                  {loading ? "Creating Tables..." : "Create Tables"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tables View Modal */}
      {showTablesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Database Tables
              </h3>
              <button
                onClick={() => setShowTablesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div
              className="p-6 overflow-y-auto"
              style={{ maxHeight: "calc(90vh - 140px)" }}
            >
              {tables.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 text-lg">No tables found</p>
                  <p className="text-gray-400 text-sm">
                    Create tables using Mermaid diagrams or SQL
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {tables.map((table, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Table className="w-5 h-5 text-blue-600" />
                        {table.tableName}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Column
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Type
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Nullable
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Default
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {table.columns.map((column, colIndex) => (
                              <tr key={colIndex}>
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                  {column.column_name}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {column.data_type}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {column.is_nullable}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {column.column_default || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Insert Modal */}
      {showManualInsertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Manual Insert
              </h3>
              <button
                onClick={() => setShowManualInsertModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Table Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Table
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setManualData({});
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a table...</option>
                  {tables.map((table) => (
                    <option key={table.tableName} value={table.tableName}>
                      {table.tableName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column Inputs */}
              {selectedTable && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Enter Data</h4>
                  {tables
                    .find((t) => t.tableName === selectedTable)
                    ?.columns.filter(
                      (col) =>
                        !(
                          col.column_name === "id" &&
                          col.column_default?.includes("nextval")
                        )
                    )
                    .map((column) => (
                      <div key={column.column_name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {column.column_name}
                          <span className="text-xs text-gray-500 ml-1">
                            ({column.data_type})
                          </span>
                          {column.is_nullable === "NO" && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type={
                            column.data_type.includes("int")
                              ? "number"
                              : column.data_type.includes("date")
                              ? "date"
                              : "text"
                          }
                          value={String(manualData[column.column_name] || "")}
                          onChange={(e) =>
                            setManualData((prev) => ({
                              ...prev,
                              [column.column_name]: e.target.value,
                            }))
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter ${column.column_name}...`}
                        />
                      </div>
                    ))}

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleManualInsert}
                      disabled={loading || !selectedTable}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? "Inserting..." : "Insert Data"}
                    </button>
                    <button
                      onClick={() => setShowManualInsertModal(false)}
                      className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsertDataModal;
