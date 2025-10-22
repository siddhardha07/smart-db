import React from "react";
import { X, Database, Upload } from "lucide-react";

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upload CSV */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
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
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Choose File
                </button>
              </div>
            </div>

            {/* Create from Mermaid */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer group">
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
                <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                  Create Tables
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center text-gray-500">
                <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No recent data insertions</p>
                <p className="text-sm">
                  Your data insertion history will appear here
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
              <div className="text-sm font-medium text-gray-900">
                View Tables
              </div>
              <div className="text-xs text-gray-500">
                See existing table structure
              </div>
            </button>

            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left">
              <div className="text-sm font-medium text-gray-900">
                Manual Insert
              </div>
              <div className="text-xs text-gray-500">Add data row by row</div>
            </button>

            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left">
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
    </div>
  );
};

export default InsertDataModal;
