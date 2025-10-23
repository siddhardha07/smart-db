import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot } from "lucide-react";
import { AIService } from "../services/aiService";
import { SQLQueryDisplay } from "./SQLQueryDisplay";

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  query?: string;
  results?: Record<string, unknown>[];
  error?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  queryId?: string;
  confidence?: number;
  requiresConfirmation?: boolean;
}

interface AIChatProps {
  onNavigateToDBMode: (query: string) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const AIChat: React.FC<AIChatProps> = ({
  onNavigateToDBMode,
  chatMessages,
  setChatMessages,
}) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await AIService.generateQuery(input.trim());

      if (response) {
        if (response.type === "clarification") {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content:
              response.explanation ||
              "Could you please provide more specific information about what you'd like to know from the database?",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, aiMessage]);
        } else if (response.query) {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content:
              response.explanation ||
              "I generated a SQL query for your request.",
            query: response.query,
            requiresConfirmation: false, // Temporarily disable risk analysis
            timestamp: new Date(),
          };

          setChatMessages((prev) => [...prev, aiMessage]);
        } else {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content:
              "I couldn't generate a query for your request. Please try asking for specific database information.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "I encountered an error processing your request.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error in AI service:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async (query: string) => {
    // Navigate to DB mode with the query
    onNavigateToDBMode(query);
  };

  const confirmExecution = (query: string) => {
    executeQuery(query);
  };

  const cancelExecution = () => {
    setPendingQuery(null);
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.requiresConfirmation ? { ...msg, requiresConfirmation: false } : msg
      )
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to AI Assistant
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              I can help you query your database using natural language. Just
              ask me what you'd like to know!
            </p>
          </div>
        )}

        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {/* AI Avatar */}
            {message.type === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Message Content */}
            <div
              className={`max-w-[70%] ${
                message.type === "user" ? "order-2" : "order-1"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-3 ${
                  message.type === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>

                <div className="text-xs mt-2 opacity-70">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {/* SQL Query Display */}
              {message.query && (
                <div className="mt-3">
                  <SQLQueryDisplay
                    query={message.query}
                    onCopy={() => navigator.clipboard.writeText(message.query!)}
                    onExecute={() => executeQuery(message.query!)}
                    showExecuteButton={true}
                  />
                </div>
              )}

              {/* Results Table */}
              {message.results && message.results.length > 0 && (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      Query Results ({message.results.length} rows)
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(message.results[0] || {}).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {message.results.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-4 py-2 whitespace-nowrap text-sm text-gray-900"
                              >
                                {value === null ? (
                                  <span className="text-gray-400 italic">
                                    null
                                  </span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {message.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {message.error}
                  </p>
                </div>
              )}

              {/* Confirmation Dialog */}
              {message.requiresConfirmation && pendingQuery && (
                <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    This query may modify your data or perform a potentially
                    sensitive operation. Would you like to proceed?
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => confirmExecution(pendingQuery)}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                    >
                      Execute
                    </button>
                    <button
                      onClick={cancelExecution}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            {message.type === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center order-3">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask me anything about your database..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
