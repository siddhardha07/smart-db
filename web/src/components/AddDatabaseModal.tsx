import React, { useState } from "react";
import { X, Database, Loader } from "lucide-react";
import { DatabaseCredentials } from "../types/database";

interface AddDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddDatabaseModal: React.FC<AddDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  const [newDb, setNewDb] = useState<Partial<DatabaseCredentials>>({
    type: "postgresql",
    host: "localhost",
    port: 5432,
    name: "",
    database: "",
    username: "",
    password: "",
  });

  const testConnection = async () => {
    // Validation for different database types
    if (newDb.type === "sqlite") {
      if (!newDb.database) {
        setConnectionMessage("Please provide the database file path");
        return;
      }
    } else {
      if (
        !newDb.host ||
        !newDb.port ||
        !newDb.database ||
        !newDb.username ||
        !newDb.password
      ) {
        setConnectionMessage("Please fill in all required fields");
        return;
      }
    }

    setTestingConnection(true);
    setConnectionMessage("");

    try {
      const response = await fetch("http://localhost:3001/api/databases/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDb),
      });

      const data = await response.json();
      setConnectionMessage(data.message);

      return data.success;
    } catch (error: unknown) {
      console.error("Test connection error:", error);
      setConnectionMessage("Failed to test connection");
      return false;
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddDatabase = async () => {
    // Validation for different database types
    if (!newDb.name || !newDb.database) {
      setConnectionMessage("Please provide database name and database field");
      return;
    }

    if (newDb.type === "sqlite") {
      // For SQLite, only need name and database file path
    } else {
      if (!newDb.host || !newDb.port || !newDb.username || !newDb.password) {
        setConnectionMessage("Please fill in all required fields");
        return;
      }
    }

    setLoading(true);
    const id = `user-${newDb.name?.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    const credentials: DatabaseCredentials = {
      id,
      name: newDb.name!,
      type: newDb.type!,
      database: newDb.database!,
      isLocal: false,
      ...(newDb.type === "sqlite"
        ? {}
        : {
            host: newDb.host!,
            port: newDb.port!,
            username: newDb.username!,
            password: newDb.password!,
          }),
    };

    try {
      const response = await fetch("http://localhost:3001/api/databases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setNewDb({
          type: "postgresql",
          host: "localhost",
          port: 5432,
          name: "",
          database: "",
          username: "",
          password: "",
        });
        setConnectionMessage("");
        onSuccess();
        onClose();
      } else {
        setConnectionMessage(data.error || "Failed to add database");
      }
    } catch (error: unknown) {
      console.error("Add database error:", error);
      setConnectionMessage("Failed to add database");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewDb({
      type: "postgresql",
      host: "localhost",
      port: 5432,
      name: "",
      database: "",
      username: "",
      password: "",
    });
    setConnectionMessage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add Database
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connection Name
            </label>
            <input
              type="text"
              value={newDb.name || ""}
              onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Production DB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database Type
            </label>
            <select
              value={newDb.type}
              onChange={(e) => {
                const type = e.target.value as
                  | "postgresql"
                  | "mysql"
                  | "sqlite";
                setNewDb({
                  ...newDb,
                  type,
                  port:
                    type === "mysql"
                      ? 3306
                      : type === "postgresql"
                      ? 5432
                      : undefined,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>

          {newDb.type !== "sqlite" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host
                </label>
                <input
                  type="text"
                  value={newDb.host || ""}
                  onChange={(e) => setNewDb({ ...newDb, host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={newDb.port || ""}
                  onChange={(e) =>
                    setNewDb({ ...newDb, port: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={newDb.type === "mysql" ? "3306" : "5432"}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {newDb.type === "sqlite" ? "Database File Path" : "Database Name"}
            </label>
            <input
              type="text"
              value={newDb.database || ""}
              onChange={(e) => setNewDb({ ...newDb, database: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                newDb.type === "sqlite"
                  ? "/path/to/database.db"
                  : newDb.type === "mysql"
                  ? "myapp"
                  : "myapp"
              }
            />
          </div>

          {newDb.type !== "sqlite" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newDb.username || ""}
                  onChange={(e) =>
                    setNewDb({ ...newDb, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={newDb.type === "mysql" ? "root" : "postgres"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newDb.password || ""}
                  onChange={(e) =>
                    setNewDb({ ...newDb, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="password"
                />
              </div>
            </>
          )}

          {/* Connection Message */}
          {connectionMessage && (
            <div
              className={`p-3 rounded-md text-sm ${
                connectionMessage.includes("Success") ||
                connectionMessage.includes("Connected")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {connectionMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {testingConnection && <Loader className="w-4 h-4 animate-spin" />}
            Test Connection
          </button>

          <button
            onClick={handleAddDatabase}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 justify-center"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            Add Database
          </button>

          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
