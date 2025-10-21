import { useState } from "react";
import {
  X,
  Database,
  FileText,
  Loader,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { createTablesFromMermaid } from "../services/apiService";

interface InsertDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  databaseName: string;
  mermaidSchema: string;
}

type SubmissionState = "idle" | "loading" | "success" | "error";

export default function InsertDataModal({
  isOpen,
  onClose,
}: InsertDataModalProps) {
  const [formData, setFormData] = useState<FormData>({
    databaseName: "",
    mermaidSchema: "",
  });

  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [responseMessage, setResponseMessage] = useState("");
  const [createdTables, setCreatedTables] = useState<string[]>([]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.databaseName.trim() || !formData.mermaidSchema.trim()) {
      setSubmissionState("error");
      setResponseMessage(
        "Please fill in both database name and Mermaid schema"
      );
      return;
    }

    setSubmissionState("loading");
    setResponseMessage("");
    setCreatedTables([]);

    try {
      const result = await createTablesFromMermaid({
        mermaidDiagram: formData.mermaidSchema,
        dropExisting: true,
      });

      if (result.success) {
        setSubmissionState("success");
        setResponseMessage(result.message);
        setCreatedTables(result.tablesCreated || []);
      } else {
        setSubmissionState("error");
        setResponseMessage(result.error || "Failed to create tables");
      }
    } catch (error) {
      setSubmissionState("error");
      setResponseMessage(
        error instanceof Error ? error.message : "Network error occurred"
      );
    }
  };

  const handleClose = () => {
    setFormData({ databaseName: "", mermaidSchema: "" });
    setSubmissionState("idle");
    setResponseMessage("");
    setCreatedTables([]);
    onClose();
  };

  const exampleSchema = `erDiagram
    CUSTOMER {
        int id
        string name
        string email
        date signup_date
    }
    ORDER {
        int id
        int customer_id
        decimal total
        timestamp created_at
    }`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Insert Data
              </h2>
              <p className="text-sm text-gray-500">
                Create database tables from Mermaid schema
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Database Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Database Name
            </label>
            <input
              type="text"
              value={formData.databaseName}
              onChange={(e) =>
                handleInputChange("databaseName", e.target.value)
              }
              placeholder="e.g., smartdb, myproject, ecommerce"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
              disabled={submissionState === "loading"}
            />
          </div>

          {/* Mermaid Schema */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Mermaid ER Schema
            </label>
            <textarea
              value={formData.mermaidSchema}
              onChange={(e) =>
                handleInputChange("mermaidSchema", e.target.value)
              }
              placeholder={exampleSchema}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors font-mono text-sm"
              disabled={submissionState === "loading"}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Mermaid ER diagram. Supports: int, string, date,
              boolean, decimal types
            </p>
          </div>

          {/* Response Message */}
          {responseMessage && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 ${
                submissionState === "success"
                  ? "bg-green-50 border border-green-200"
                  : submissionState === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              {submissionState === "success" && (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              )}
              {submissionState === "error" && (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    submissionState === "success"
                      ? "text-green-800"
                      : submissionState === "error"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  {responseMessage}
                </p>
                {createdTables.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 font-medium">
                      Created tables:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {createdTables.map((table) => (
                        <span
                          key={table}
                          className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                        >
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={submissionState === "loading"}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submissionState === "loading" ||
                !formData.databaseName.trim() ||
                !formData.mermaidSchema.trim()
              }
              className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submissionState === "loading" ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating Tables...
                </>
              ) : (
                "Create Tables"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
