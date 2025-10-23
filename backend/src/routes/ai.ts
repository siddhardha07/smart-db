import express from "express";
import { AISchemaAnalyzer } from "../db/aiSchemaAnalyzer";
import { GeminiAIService } from "../db/geminiAIService";

const router = express.Router();

// Store AI service instances by session (simple in-memory store)
// In production, you might want to use Redis or database sessions
const aiSessions = new Map<string, GeminiAIService>();

// Clean up old sessions (basic cleanup - runs every hour)
setInterval(() => {
  const sessionKeys = Array.from(aiSessions.keys());
  if (sessionKeys.length > 100) {
    // Keep max 100 sessions
    const toDelete = sessionKeys.slice(0, sessionKeys.length - 100);
    toDelete.forEach((key) => aiSessions.delete(key));
  }
}, 3600000); // 1 hour

/**
 * GET /api/ai/schema-context
 * Get comprehensive database schema information for AI
 */
router.get("/schema-context", async (req, res) => {
  try {
    const context = await AISchemaAnalyzer.getAIContext();
    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error("Error getting AI schema context:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze database schema",
    });
  }
});

/**
 * POST /api/ai/analyze-query
 * Analyze a SQL query for risk assessment
 */
router.post("/analyze-query", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "Query parameter is required and must be a string",
      });
    }

    const riskAnalysis = AISchemaAnalyzer.analyzeQueryRisk(query);

    res.json({
      success: true,
      data: riskAnalysis,
    });
  } catch (error) {
    console.error("Error analyzing query:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze query",
    });
  }
});

/**
 * POST /api/ai/generate-query
 * Generate SQL query from natural language input using conversational Gemini AI
 */
router.post("/generate-query", async (req, res) => {
  try {
    const { userInput, sessionId } = req.body;

    if (!userInput || typeof userInput !== "string") {
      return res.status(400).json({
        success: false,
        error: "userInput parameter is required and must be a string",
      });
    }

    // Get current schema context
    const schema = await AISchemaAnalyzer.getAIContext();

    // Check if Gemini API key is configured
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return res.status(500).json({
        success: false,
        error:
          "API_KEY is not configured. Please set your Google Gemini API key in environment variables.",
      });
    }

    // Get or create AI service for this session
    const currentSessionId = sessionId || "default";
    let geminiService = aiSessions.get(currentSessionId);

    if (!geminiService) {
      console.log("🆕 Creating new AI session:", currentSessionId);
      geminiService = new GeminiAIService(apiKey);
      aiSessions.set(currentSessionId, geminiService);
    }

    // Generate query using conversational AI
    console.log("🤖 Using Gemini AI for query:", userInput);
    const result = await geminiService.generateQuery(userInput, schema);

    res.json({
      success: true,
      data: result,
      sessionId: currentSessionId,
    });
  } catch (error) {
    console.error("Error generating query:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate query. Please try again.",
    });
  }
});

/**
 * GET /api/ai/sample-data/:tableName
 * Get sample data from a specific table
 */
router.get("/sample-data/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: "Table name is required",
      });
    }

    const sampleData = await AISchemaAnalyzer.getSampleData(tableName);

    res.json({
      success: true,
      data: sampleData,
    });
  } catch (error) {
    console.error("Error getting sample data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get sample data",
    });
  }
});

/**
 * POST /api/ai/reset-session
 * Reset AI conversation session
 */
router.post("/reset-session", async (req, res) => {
  try {
    const { sessionId } = req.body;
    const currentSessionId = sessionId || "default";

    const geminiService = aiSessions.get(currentSessionId);
    if (geminiService) {
      geminiService.resetSession();
      console.log("🔄 Reset AI session:", currentSessionId);
    }

    res.json({
      success: true,
      message: "Session reset successfully",
      sessionId: currentSessionId,
    });
  } catch (error) {
    console.error("Error resetting session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset session",
    });
  }
});

export default router;
