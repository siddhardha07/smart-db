import { useState } from "react";
import HomePage from "./pages/HomePage";
import AIMode from "./pages/AIMode";
import DBMode from "./pages/DBMode";
import { DatabaseExplorer } from "./components/DatabaseExplorerSidebar";
import { AppMode } from "./types";
import { LOCAL_DB_ID } from "./types/database";

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

function App() {
  const [mode, setMode] = useState<AppMode>("home");
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([
    LOCAL_DB_ID,
  ]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleDatabaseSelectionChange = (databases: string[]) => {
    setSelectedDatabases(databases);
  };

  const handleAIMode = () => {
    setMode("ai");
  };

  const handleDBMode = () => {
    setMode("db");
  };

  const handleBackToHome = () => {
    setMode("home");
    setPendingQuery(null); // Clear any pending query when going back to home
  };

  const handleNavigateToDBMode = (query: string) => {
    setPendingQuery(query);
    setMode("db");
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Full Width Header */}
      <header className="bg-white shadow-sm border-b z-10">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">SmartDB AI</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Database Explorer Sidebar */}
        <DatabaseExplorer
          selectedDatabases={selectedDatabases}
          onDatabaseSelectionChange={handleDatabaseSelectionChange}
        />

        {/* Page Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {mode === "home" && (
            <HomePage onAIMode={handleAIMode} onDBMode={handleDBMode} />
          )}
          {mode === "ai" && (
            <AIMode
              onBack={handleBackToHome}
              selectedDatabases={selectedDatabases}
              onNavigateToDBMode={handleNavigateToDBMode}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
            />
          )}
          {mode === "db" && (
            <DBMode
              onBack={handleBackToHome}
              selectedDatabases={selectedDatabases}
              initialQuery={pendingQuery}
              onNavigateToAIMode={handleAIMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
