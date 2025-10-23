import React, { useState, useEffect, useRef } from "react";
import { X, Download, RefreshCw, ChevronDown } from "lucide-react";

interface TableData {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  totalRows: number;
}

interface TableDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
  tableName: string;
}

const TableDataModal: React.FC<TableDataModalProps> = ({
  isOpen,
  onClose,
  databaseId,
  tableName,
}) => {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  const loadTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/databases/${databaseId}/tables/${tableName}/data`
      );
      const data = await response.json();

      if (data.success) {
        setTableData(data.data);
      } else {
        setError(data.message || "Failed to load table data");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error("Error loading table data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && databaseId && tableName) {
      loadTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, databaseId, tableName]);

  const handleRefresh = () => {
    loadTableData();
  };

  const exportAsCSV = () => {
    if (!tableData) return;

    const headers = tableData.columns.join(",");
    const rows = tableData.rows
      .map((row) =>
        tableData.columns
          .map((col) => {
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
    a.download = `${tableName}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    if (!tableData) return;

    const jsonData = {
      tableName: tableData.tableName,
      columns: tableData.columns,
      rows: tableData.rows,
      totalRows: tableData.totalRows,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsXLSX = () => {
    if (!tableData) return;

    // Create workbook data
    const worksheetData = [
      tableData.columns, // Header row
      ...tableData.rows.map((row) =>
        tableData.columns.map((col) => row[col] ?? "")
      ),
    ];

    // Convert to TSV (tab-separated values) which Excel can open
    const tsvContent = worksheetData.map((row) => row.join("\t")).join("\n");

    const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}_data.xlsx`;
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
    setShowDownloadMenu(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadRef.current &&
        !downloadRef.current.contains(event.target as Node)
      ) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 left-96 w-full max-w-6xl h-[90vh] z-[200] pointer-events-none">
      <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col pointer-events-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Table Data: {tableName}
            </h2>
            {tableData && (
              <p className="text-sm text-gray-500 mt-1">
                Showing {tableData.rowCount} rows
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={!tableData || loading}
                className="flex items-center gap-1 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Export Data"
              >
                <Download className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {showDownloadMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => handleExportFormat("csv")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExportFormat("json")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExportFormat("xlsx")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                  >
                    Export as XLSX
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading table data...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {tableData && !loading && (
            <div className="h-full overflow-auto">
              <div className="min-w-full overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {tableData.columns.map((column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-300 whitespace-nowrap last:border-r-0"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.rows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {tableData.columns.map((column) => (
                          <td
                            key={column}
                            className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                            title={String(row[column] ?? "")}
                          >
                            {String(row[column] ?? "NULL")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {tableData.rows.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No data found in this table.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableDataModal;
