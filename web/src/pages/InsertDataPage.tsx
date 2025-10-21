import { useState } from "react";
import { Database, Plus, ArrowLeft } from "lucide-react";
import DatabaseExplorer from "../components/DatabaseExplorer";
import DataUpload from "../components/DataUpload";
import InsertDataModal from "../components/InsertDataModal";

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

interface InsertDataPageProps {
  onBack: () => void;
}

export default function InsertDataPage({ onBack }: InsertDataPageProps) {
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInfo | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDatabaseSelect = (database: DatabaseInfo | null) => {
    setSelectedDatabase(database);
  };

  const handleCreateDatabase = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                    Insert Data
                  </h1>
                  <p className="text-sm text-gray-500">
                    Upload data to your databases
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateDatabase}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Database
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Panel Layout */}
      <div className="max-w-full mx-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* Left Panel - Database Explorer */}
          <div className="col-span-4">
            <DatabaseExplorer
              onDatabaseSelect={handleDatabaseSelect}
              selectedDatabase={selectedDatabase}
            />
          </div>

          {/* Right Panel - Context Sensitive Content */}
          <div className="col-span-8">
            {selectedDatabase ? (
              <DataUpload database={selectedDatabase} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Database className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Database Selected
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Select a database from the left panel to upload data or
                    create a new one.
                  </p>
                  <button
                    onClick={handleCreateDatabase}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create Database
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for creating new databases */}
      {isModalOpen && (
        <InsertDataModal isOpen={isModalOpen} onClose={handleModalClose} />
      )}
    </div>
  );
}
