import { Database, ChevronRight, Folder, Table } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSchemaMetadata } from '../services/apiService';

interface DatabaseInfo {
  name: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      sqlType: string;
    }>;
  }>;
}

interface DatabaseExplorerProps {
  onDatabaseSelect: (database: DatabaseInfo | null) => void;
  selectedDatabase: DatabaseInfo | null;
}

export default function DatabaseExplorer({ onDatabaseSelect, selectedDatabase }: DatabaseExplorerProps) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      // For now, we'll check if smartdb has any tables
      const metadata = await getSchemaMetadata();
      
      if (metadata.success && metadata.metadata.tables.length > 0) {
        const smartdbInfo: DatabaseInfo = {
          name: 'smartdb',
          tables: metadata.metadata.tables
        };
        setDatabases([smartdbInfo]);
      } else {
        setDatabases([]);
      }
    } catch (error) {
      console.error('Failed to load databases:', error);
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDatabaseExpansion = (dbName: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
    }
    setExpandedDatabases(newExpanded);
  };

  const handleDatabaseSelect = (database: DatabaseInfo) => {
    if (selectedDatabase?.name === database.name) {
      onDatabaseSelect(null); // Deselect if clicking the same database
    } else {
      onDatabaseSelect(database);
      // Auto-expand when selected
      setExpandedDatabases(prev => new Set([...prev, database.name]));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Database className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Databases</h2>
          <p className="text-sm text-gray-500">SmartDB AI managed databases</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : databases.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No databases found</p>
          <p className="text-gray-400 text-xs mt-1">Create tables to see databases here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {databases.map((db) => (
            <div key={db.name} className="space-y-1">
              {/* Database Item */}
              <div
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDatabase?.name === db.name
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleDatabaseSelect(db)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDatabaseExpansion(db.name);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedDatabases.has(db.name) ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                
                <div className="bg-blue-100 p-2 rounded">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{db.name}</p>
                  <p className="text-xs text-gray-500">
                    {db.tables.length} table{db.tables.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {selectedDatabase?.name === db.name && (
                  <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                    Selected
                  </div>
                )}
              </div>

              {/* Tables List (when expanded) */}
              {expandedDatabases.has(db.name) && (
                <div className="ml-8 space-y-1">
                  {db.tables.map((table) => (
                    <div
                      key={table.name}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <Table className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-600">{table.name}</span>
                      <span className="text-xs text-gray-400">
                        ({table.columns.length} cols)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={loadDatabases}
        className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700 py-2"
      >
        Refresh
      </button>
    </div>
  );
}