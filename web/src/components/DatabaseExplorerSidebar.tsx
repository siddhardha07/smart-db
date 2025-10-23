import React, { useState, useEffect } from "react";
import { Database, Plus, MoreVertical, Table } from "lucide-react";
import { DatabaseInfo } from "../types/database";
import { AddDatabaseModal } from "./AddDatabaseModal";
import InsertDataModal from "./InsertDataModal";
import TableDataModal from "./TableDataModal";

interface TableInfo {
  tableName: string;
  columns: {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }[];
}

interface DatabaseSchema {
  [databaseId: string]: TableInfo[];
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  databaseId: string;
  databaseName: string;
  onInsertData: () => void;
  onShowTables: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  onInsertData,
  onShowTables,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Context menu */}
      <div
        className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]"
        style={{ left: x, top: y }}
      >
        <button
          onClick={onShowTables}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
        >
          <Table className="w-4 h-4" />
          Tables
        </button>
        <button
          onClick={() => {
            onInsertData();
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
        >
          <Database className="w-4 h-4" />
          Insert Data
        </button>
      </div>
    </>
  );
};

export const DatabaseExplorer: React.FC = () => {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showTableDataModal, setShowTableDataModal] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [databaseSchemas, setDatabaseSchemas] = useState<DatabaseSchema>({});
  const [loadingSchemas, setLoadingSchemas] = useState<Set<string>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(
    new Set()
  );
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    databaseId: string;
    databaseName: string;
  }>({ isOpen: false, x: 0, y: 0, databaseId: "", databaseName: "" });

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/databases");
      const data = await response.json();

      if (data.success) {
        setDatabases(data.databases);
      }
    } catch (error) {
      console.error("Error loading databases:", error);
      // Add fallback local database
      setDatabases([
        {
          id: "pg-db",
          name: "local-db",
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: "smartdb",
          isLocal: true,
          lastUsed: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseSchema = async (databaseId: string) => {
    if (databaseSchemas[databaseId] || loadingSchemas.has(databaseId)) {
      return; // Already loaded or loading
    }

    setLoadingSchemas((prev) => new Set(prev).add(databaseId));

    try {
      const response = await fetch(
        `http://localhost:3001/api/databases/${databaseId}/schema`
      );
      const data = await response.json();

      if (data.success) {
        setDatabaseSchemas((prev) => ({
          ...prev,
          [databaseId]: data.schema,
        }));
      }
    } catch (error) {
      console.error("Error loading database schema:", error);
    } finally {
      setLoadingSchemas((prev) => {
        const newSet = new Set(prev);
        newSet.delete(databaseId);
        return newSet;
      });
    }
  };

  const handleShowTables = async (databaseId: string) => {
    setSelectedDatabase(databaseId);

    // Toggle the expanded state for this database
    const isExpanded = expandedDatabases.has(databaseId);

    if (!isExpanded) {
      // Load schema if not already loaded
      if (!databaseSchemas[databaseId] && !loadingSchemas.has(databaseId)) {
        await loadDatabaseSchema(databaseId);
      }
      setExpandedDatabases((prev) => new Set([...prev, databaseId]));
    } else {
      setExpandedDatabases((prev) => {
        const newSet = new Set(prev);
        newSet.delete(databaseId);
        return newSet;
      });
    }

    setContextMenu({
      isOpen: false,
      x: 0,
      y: 0,
      databaseId: "",
      databaseName: "",
    });
  };

  const handleTableClick = (databaseId: string, tableName: string) => {
    setSelectedDatabase(databaseId);
    setSelectedTable(tableName);
    setShowTableDataModal(true);
  };

  const handleRightClick = (
    e: React.MouseEvent,
    databaseId: string,
    databaseName: string
  ) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      databaseId,
      databaseName,
    });
  };

  const handleThreeDotsClick = (
    e: React.MouseEvent,
    databaseId: string,
    databaseName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Position menu relative to the button
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      x: rect.left - 120, // Position to the left of the button
      y: rect.bottom + 4, // Position below the button
      databaseId,
      databaseName,
    });
  };

  const handleInsertData = (databaseId: string) => {
    setSelectedDatabase(databaseId);
    setShowInsertModal(true);
  };

  const handleAddDatabaseSuccess = () => {
    setShowAddModal(false);
    loadDatabases();
  };

  if (loading) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-3"></div>
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col relative z-[100]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Database Explorer
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-md transition-colors"
              title="Add Database"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Database List */}
        <div className="flex-1 overflow-y-auto p-2">
          {databases.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No databases found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2"
              >
                Add your first database
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {databases.map((db) => (
                <div key={db.id} className="space-y-1">
                  {/* Database Header */}
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors group">
                    {/* Database Icon */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          db.isLocal
                            ? "bg-green-100 text-green-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        <Database className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Database Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {db.name}
                        </p>
                        {db.isLocal && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">
                            Local
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {db.type} • {db.host}:{db.port}
                      </p>
                    </div>

                    {/* Three-dots menu button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => handleThreeDotsClick(e, db.id, db.name)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-30 group-hover:opacity-100 transition-all duration-200"
                        title="More options"
                        onContextMenu={(e) =>
                          handleRightClick(e, db.id, db.name)
                        }
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tables List (when expanded) */}
                  {expandedDatabases.has(db.id) && (
                    <div className="ml-6 space-y-1">
                      {loadingSchemas.has(db.id) ? (
                        <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                          Loading tables...
                        </div>
                      ) : databaseSchemas[db.id] ? (
                        databaseSchemas[db.id].length > 0 ? (
                          databaseSchemas[db.id].map((table) => (
                            <div
                              key={table.tableName}
                              onClick={() =>
                                handleTableClick(db.id, table.tableName)
                              }
                              className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors group"
                            >
                              <Table className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                {table.tableName}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {table.columns.length} cols
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">
                            No tables found
                          </div>
                        )
                      ) : (
                        <div className="p-2 text-sm text-gray-500">
                          Failed to load tables
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        databaseId={contextMenu.databaseId}
        databaseName={contextMenu.databaseName}
        onShowTables={() => handleShowTables(contextMenu.databaseId)}
        onInsertData={() => handleInsertData(contextMenu.databaseId)}
        onClose={() =>
          setContextMenu({
            isOpen: false,
            x: 0,
            y: 0,
            databaseId: "",
            databaseName: "",
          })
        }
      />

      {/* Add Database Modal */}
      <AddDatabaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddDatabaseSuccess}
      />

      {/* Insert Data Modal */}
      <InsertDataModal
        isOpen={showInsertModal}
        onClose={() => setShowInsertModal(false)}
        selectedDatabase={selectedDatabase}
      />

      {/* Table Data Modal */}
      <TableDataModal
        isOpen={showTableDataModal}
        onClose={() => setShowTableDataModal(false)}
        databaseId={selectedDatabase}
        tableName={selectedTable}
      />
    </>
  );
};

export default DatabaseExplorer;
