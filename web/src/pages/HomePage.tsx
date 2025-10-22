import { Database, Brain, Sparkles, Zap } from "lucide-react";

interface HomePageProps {
  onAIMode: () => void;
  onDBMode: () => void;
}

export default function HomePage({ onAIMode, onDBMode }: HomePageProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="text-center max-w-4xl px-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full shadow-lg">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SmartDB AI
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
            The intelligent database management platform that combines the power
            of AI with direct database control.
          </p>
        </div>

        <div className="flex gap-6 justify-center mb-8">
          {/* AI Mode */}
          <div
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border border-purple-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group w-72"
            onClick={onAIMode}
          >
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full w-12 h-12 mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <h2 className="text-xl font-bold text-gray-900">AI Mode</h2>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm">
              Query databases in natural language. Get insights and generate SQL
              with AI assistance.
            </p>
            <div className="inline-flex items-center gap-2 text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
              <span>Start AI Chat</span>
              <Zap className="w-4 h-4" />
            </div>
          </div>

          {/* DB Mode */}
          <div
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-xl border border-blue-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group w-72"
            onClick={onDBMode}
          >
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-full w-12 h-12 mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <h2 className="text-xl font-bold text-gray-900">Database Mode</h2>
              <Database className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm">
              Write and execute SQL queries, manage schemas, and perform
              database operations.
            </p>
            <div className="inline-flex items-center gap-2 text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
              <span>Open Console</span>
              <Database className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3">
            <div className="bg-green-100 p-2 rounded-full w-8 h-8 mx-auto mb-2">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">
              Lightning Fast
            </h3>
            <p className="text-xs text-gray-600">Optimized performance</p>
          </div>
          <div className="p-3">
            <div className="bg-purple-100 p-2 rounded-full w-8 h-8 mx-auto mb-2">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">
              AI-Powered
            </h3>
            <p className="text-xs text-gray-600">Natural language queries</p>
          </div>
          <div className="p-3">
            <div className="bg-blue-100 p-2 rounded-full w-8 h-8 mx-auto mb-2">
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">
              Multi-Database
            </h3>
            <p className="text-xs text-gray-600">Multiple connections</p>
          </div>
        </div>
      </div>
    </div>
  );
}
