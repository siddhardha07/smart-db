import { useState } from "react";
import HomePage from "./pages/HomePage";
import InsertDataPage from "./pages/InsertDataPage";
import { AppMode } from "./types";

function App() {
  const [mode, setMode] = useState<AppMode>("home");

  const handleInsertData = () => {
    setMode("insert");
  };

  const handleBackToHome = () => {
    setMode("home");
  };

  return (
    <>
      {mode === "home" && <HomePage onInsertData={handleInsertData} />}
      {mode === "insert" && <InsertDataPage onBack={handleBackToHome} />}
    </>
  );
}

export default App;
