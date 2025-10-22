import { useState } from "react";
import HomePage from "./pages/HomePage";
import AIMode from "./pages/AIMode";
import DBMode from "./pages/DBMode";
import { DatabaseExplorer } from "./components/DatabaseExplorerSidebar";
import { AppMode } from "./types";
import { LOCAL_DB_ID } from "./types/database";

function App() {
  const [mode, setMode] = useState<AppMode>("home");
  const [selectedDatabase] = useState<string>(LOCAL_DB_ID);

  const handleAIMode = () => {
    setMode("ai");
  };

  const handleDBMode = () => {
    setMode("db");
  };

  const handleBackToHome = () => {
    setMode("home");
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
        <DatabaseExplorer />

        {/* Page Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {mode === "home" && (
            <HomePage onAIMode={handleAIMode} onDBMode={handleDBMode} />
          )}
          {mode === "ai" && (
            <AIMode
              onBack={handleBackToHome}
              selectedDatabase={selectedDatabase}
            />
          )}
          {mode === "db" && (
            <DBMode
              onBack={handleBackToHome}
              selectedDatabase={selectedDatabase}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
