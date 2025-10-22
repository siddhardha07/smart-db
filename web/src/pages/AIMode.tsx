import { Brain, ArrowLeft } from "lucide-react";

interface AIModeProps {
  onBack: () => void;
  selectedDatabase: string;
}

export default function AIMode({ onBack, selectedDatabase }: AIModeProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
              Connected to: {selectedDatabase}
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-purple-100 p-6 rounded-full w-24 h-24 mx-auto mb-6">
            <Brain className="w-12 h-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            AI Mode Coming Soon
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Chat with your database using natural language. Ask questions, get
            insights, and generate queries with AI assistance.
          </p>
          <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              🔮 This feature is under development and will be available soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
