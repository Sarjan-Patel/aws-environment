import OpenAI from "openai"

// Singleton OpenAI client instance
let openaiClient: OpenAI | null = null

/**
 * Get or create the OpenAI client instance
 * Uses the OPENAI_API_KEY environment variable
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. " +
        "Please add your OpenAI API key to .env.local"
      )
    }

    openaiClient = new OpenAI({
      apiKey,
    })
  }

  return openaiClient
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/**
 * Default model for cost optimization explanations
 * Using gpt-4o-mini for cost-effectiveness with good quality
 */
export const DEFAULT_MODEL = "gpt-4o-mini"

/**
 * Model for more complex analysis (when needed)
 */
export const ADVANCED_MODEL = "gpt-4o"

/**
 * Configuration for AI requests
 */
export interface AIRequestConfig {
  model?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Default configuration for explanation generation
 */
export const DEFAULT_CONFIG: AIRequestConfig = {
  model: DEFAULT_MODEL,
  maxTokens: 500,
  temperature: 0.3, // Lower temperature for more focused, consistent responses
}
