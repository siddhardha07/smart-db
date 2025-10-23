import { GoogleGenerativeAI } from "@google/generative-ai";
import { AISchemaContext, AITableInfo } from "./aiSchemaAnalyzer";
import { QueryGenerationResult } from "../types/ai";

/**
 * Google Gemini AI Service for intelligent SQL query generation
 * Supports conversational chat sessions with memory
 */
export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chat: any;
  private sessionInitialized: boolean = false;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use the working Gemini model
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
  }

  /**
   * Initialize chat session with system prompt (called once per session)
   */
  async initializeSession(schema: AISchemaContext): Promise<void> {
    if (this.sessionInitialized) {
      return; // Already initialized
    }

    const systemPrompt = this.buildSystemPrompt(schema);

    // Start chat session with system context
    this.chat = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I'm ready to generate PostgreSQL queries based on your database schema. Please provide your natural language request and I'll convert it to optimized SQL.",
            },
          ],
        },
      ],
    });

    this.sessionInitialized = true;
  }

  /**
   * Generate SQL query from natural language using conversational AI
   */
  async generateQuery(
    userInput: string,
    schema: AISchemaContext
  ): Promise<QueryGenerationResult> {
    try {
      // Initialize session if not already done
      await this.initializeSession(schema);

      // Send only the user question to the chat
      const result = await this.chat.sendMessage(userInput);
      const response = await result.response;
      const text = response.text();

      // Parse the AI response
      return this.parseAIResponse(text, userInput);
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return this.generateErrorResponse(error);
    }
  }

  /**
   * Reset the chat session (useful for starting fresh)
   */
  resetSession(): void {
    this.chat = null;
    this.sessionInitialized = false;
  }

  /**
   * Build system prompt (sent only once at session start)
   */
  private buildSystemPrompt(schema: AISchemaContext): string {
    const tablesInfo = schema.tables
      .map((table) => {
        const columns = table.columns
          .map(
            (col) =>
              `${col.name} (${col.type}${
                col.nullable ? ", nullable" : ", required"
              })`
          )
          .join(", ");

        return `Table: ${table.name} (${table.estimatedRows} rows)
Columns: ${columns}`;
      })
      .join("\n\n");

    const relationshipsInfo =
      schema.relationships.length > 0
        ? `\nRelationships:\n${schema.relationships
            .map(
              (rel) =>
                `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`
            )
            .join("\n")}`
        : "";

    return `You are a PostgreSQL SQL expert. Generate accurate, efficient SQL queries from natural language requests.

DATABASE SCHEMA:
${tablesInfo}
${relationshipsInfo}

CORE RULES:
1. Always generate a working SQL query for the request
2. Use proper JOIN syntax when connecting tables
3. Use ILIKE for case-insensitive text matching
3. Use ILIKE for case-insensitive text matching.
4. Include ORDER BY when data ordering matters for consistency.
5. Always use table.column syntax to avoid ambiguity.
6. Prefer simple, readable queries over complex ones.
7. Always provide formatted queries.
8. Suggest faster or more optimal alternatives if applicable.
9. Include comments in the SQL code to explain complex logic.
10. Use better naming conventions for aliases to improve readability.
11. Dont use t1, t2 for tables, instead use meaningful letters (e.g., u for users, sb for school_branches).

RESPOND WITH VALID JSON:
{
  "type": "query",
  "query": "SELECT ... FROM ... WHERE ... ORDER BY ...",
  "explanation": "Brief explanation of what this query returns",
  "confidence": 0.9,
  "riskLevel": "LOW"
}

For data-modifying operations (DELETE, UPDATE, INSERT, DROP):
{
  "type": "warning",
  "query": "DELETE FROM table WHERE condition",
  "explanation": "WARNING: This will permanently modify/delete data. Explain the operation.",
  "confidence": 0.8,
  "riskLevel": "HIGH"
}

Only use clarification if the request is completely unclear:
{
  "type": "clarification",
  "query": null,
  "explanation": "I need more details: [specific question about what data you want]",
  "confidence": 0.0,
  "riskLevel": "LOW"
}

From now on, I will respond to your natural language requests with SQL queries in this JSON format.`;
  }

  /**
   * Parse AI response into QueryGenerationResult
   */
  private parseAIResponse(
    aiResponse: string,
    userInput: string
  ): QueryGenerationResult {
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse
          .replace(/```json\n?/, "")
          .replace(/\n?```$/, "");
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse
          .replace(/```\n?/, "")
          .replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(cleanResponse);

      // Validate the response structure
      if (!parsed.type || !parsed.explanation) {
        throw new Error("Invalid AI response structure");
      }

      // Ensure confidence is a number between 0 and 1
      parsed.confidence =
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.7;

      // Ensure riskLevel is valid
      if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(parsed.riskLevel)) {
        parsed.riskLevel = "MEDIUM";
      }

      // Additional safety check for the query
      if (parsed.type === "query" && parsed.query) {
        const safetyCheck = this.validateQuerySafety(parsed.query);
        if (!safetyCheck.safe) {
          return {
            type: "clarification",
            query: null,
            explanation: `Safety concern: ${safetyCheck.reason}. Please rephrase your request.`,
            confidence: 0.0,
            riskLevel: "HIGH",
          };
        }
      }

      return {
        type: parsed.type,
        query: parsed.query,
        explanation: parsed.explanation,
        confidence: parsed.confidence,
        riskLevel: parsed.riskLevel,
        optimizationTips: parsed.optimizationTips || [],
        alternatives: parsed.alternatives || [],
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Raw AI response:", aiResponse);

      return {
        type: "clarification",
        query: null,
        explanation: `I had trouble understanding how to help with "${userInput}". Could you please rephrase your request?`,
        confidence: 0.1,
        riskLevel: "LOW",
      };
    }
  }

  /**
   * Validate query safety - only allow SELECT queries
   */
  private validateQuerySafety(query: string): {
    safe: boolean;
    reason?: string;
  } {
    const upperQuery = query.trim().toUpperCase();

    // Block dangerous operations
    const dangerousKeywords = [
      "DELETE",
      "DROP",
      "INSERT",
      "UPDATE",
      "ALTER",
      "CREATE",
      "TRUNCATE",
      "REPLACE",
      "MERGE",
      "CALL",
      "EXEC",
    ];

    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return {
          safe: false,
          reason: `Query contains potentially dangerous operation: ${keyword}`,
        };
      }
    }

    // Must start with SELECT
    if (!upperQuery.startsWith("SELECT")) {
      return {
        safe: false,
        reason: "Only SELECT queries are allowed",
      };
    }

    return { safe: true };
  }

  /**
   * Generate error response for AI failures
   */
  private generateErrorResponse(error: any): QueryGenerationResult {
    return {
      type: "clarification",
      query: null,
      explanation:
        "I encountered an issue processing your request. Please try rephrasing your question.",
      confidence: 0.0,
      riskLevel: "LOW",
    };
  }
}
