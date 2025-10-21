import { Database, Plus } from "lucide-react";

interface HomePageProps {
  onInsertData: () => void;
}

export default function HomePage({ onInsertData }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-16">
          <div className="bg-blue-100 p-4 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center">
            <Database className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            SmartDB AI
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12">
            Create database schemas from Mermaid diagrams and insert data with
            intelligent automation.
          </p>

          <button
            onClick={onInsertData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl flex items-center gap-3 transition-colors shadow-lg text-lg font-semibold mx-auto"
          >
            <Plus className="w-6 h-6" />
            Get Started
          </button>
        </div>

        <div className="mt-16">
          <p className="text-slate-400 text-sm">
            Powered by advanced AI technology and secure database connectivity
          </p>
        </div>
      </div>
    </div>
  );
}
