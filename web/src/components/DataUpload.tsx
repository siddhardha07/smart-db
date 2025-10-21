import { useState } from "react";
import {
  Upload,
  FileJson,
  Send,
  CheckCircle,
  AlertCircle,
  Loader,
  Table,
  Info,
} from "lucide-react";

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

interface DataUploadProps {
  database: DatabaseInfo;
}

type UploadState = "idle" | "loading" | "success" | "error";

export default function DataUpload({ database }: DataUploadProps) {
  const [jsonData, setJsonData] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [responseMessage, setResponseMessage] = useState("");

  const generateExampleData = () => {
    // Generate example JSON based on the schema
    const example: Record<string, Record<string, string | number | boolean>[]> =
      {};

    database.tables.forEach((table) => {
      example[table.name] = [
        table.columns.reduce((obj, col) => {
          if (col.name === "id") return obj; // Skip auto-generated IDs

          switch (col.type.toLowerCase()) {
            case "string":
              obj[col.name] = `Sample ${col.name}`;
              break;
            case "int":
            case "integer":
              obj[col.name] = 100;
              break;
            case "decimal":
            case "float":
              obj[col.name] = 99.99;
              break;
            case "date":
              obj[col.name] = "2025-01-01";
              break;
            case "timestamp":
            case "datetime":
              obj[col.name] = "2025-01-01T10:00:00Z";
              break;
            case "boolean":
            case "bool":
              obj[col.name] = true;
              break;
            default:
              obj[col.name] = `Sample ${col.name}`;
          }
          return obj;
        }, {} as Record<string, string | number | boolean>),
      ];
    });

    return JSON.stringify(example, null, 2);
  };

  const handleGenerateExample = () => {
    const example = generateExampleData();
    setJsonData(example);
  };

  const handleUpload = async () => {
    if (!jsonData.trim()) {
      setUploadState("error");
      setResponseMessage("Please enter JSON data");
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonData); // Validate JSON
    } catch {
      setUploadState("error");
      setResponseMessage("Invalid JSON format");
      return;
    }

    setUploadState("loading");
    setResponseMessage("");

    try {
      const response = await fetch("http://localhost:3001/api/data/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          database: database.name,
          data: parsedData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadState("success");
        setResponseMessage(
          `Data uploaded successfully! ${result.insertedRecords} records inserted.`
        );
      } else {
        setUploadState("error");
        setResponseMessage(result.error || "Failed to upload data");
      }
    } catch (error) {
      setUploadState("error");
      setResponseMessage(
        error instanceof Error ? error.message : "Failed to upload data"
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Upload className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Upload Data</h2>
          <p className="text-sm text-gray-500">
            Insert JSON data into {database.name}
          </p>
        </div>
      </div>

      {/* Schema Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-2">Database Schema</h3>
            <div className="space-y-2">
              {database.tables.map((table) => (
                <div
                  key={table.name}
                  className="bg-white rounded p-3 border border-blue-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Table className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {table.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex justify-between">
                        <span className="text-gray-600">{col.name}</span>
                        <span className="text-gray-500 font-mono">
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* JSON Data Input */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            <FileJson className="w-4 h-4 inline mr-1" />
            JSON Data
          </label>
          <button
            onClick={handleGenerateExample}
            className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Generate Example
          </button>
        </div>
        <textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          placeholder={`{\n  "table_name": [\n    {\n      "column1": "value1",\n      "column2": "value2"\n    }\n  ]\n}`}
          rows={12}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors font-mono text-sm"
          disabled={uploadState === "loading"}
        />
        <p className="text-xs text-gray-500 mt-2">
          Provide JSON data with table names as keys and arrays of records as
          values. IDs will be auto-generated.
        </p>
      </div>

      {/* Response Message */}
      {responseMessage && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 mb-6 ${
            uploadState === "success"
              ? "bg-green-50 border border-green-200"
              : uploadState === "error"
              ? "bg-red-50 border border-red-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          {uploadState === "success" && (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          )}
          {uploadState === "error" && (
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          )}
          <p
            className={`text-sm font-medium ${
              uploadState === "success"
                ? "text-green-800"
                : uploadState === "error"
                ? "text-red-800"
                : "text-blue-800"
            }`}
          >
            {responseMessage}
          </p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploadState === "loading" || !jsonData.trim()}
        className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {uploadState === "loading" ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Uploading Data...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Upload Data
          </>
        )}
      </button>
    </div>
  );
}
