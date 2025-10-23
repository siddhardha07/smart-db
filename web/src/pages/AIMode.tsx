import { Brain, ArrowLeft, Database } from "lucide-react";
import AIChat from "../components/AIChat";

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  query?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  queryId?: string;
  confidence?: number;
  requiresConfirmation?: boolean;
}

interface AIModeProps {
  onBack: () => void;
  selectedDatabases: string[];
  onNavigateToDBMode: (query: string) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function AIMode({
  onBack,
  selectedDatabases,
  onNavigateToDBMode,
  chatMessages,
  setChatMessages,
}: AIModeProps) {
  const handleNavigateToDBMode = (query: string) => {
    // Pass the query to DB mode for execution
    onNavigateToDBMode(query);
  };
  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Mode</h1>
              <p className="text-sm text-gray-500">
                Connected to:{" "}
                {selectedDatabases.length === 1
                  ? selectedDatabases[0]
                  : `${selectedDatabases.length} databases`}
              </p>
            </div>
          </div>
        </div>

        {/* DB Mode Button */}
        <button
          onClick={() => onNavigateToDBMode("")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Database className="w-4 h-4" />
          <span>DB Mode</span>
        </button>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-hidden">
        <AIChat
          onNavigateToDBMode={handleNavigateToDBMode}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
        />
      </div>
    </div>
  );
}
