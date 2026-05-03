/**
 * Unified AI Provider Interface
 * Allows switching between Gemini and OpenAI based on environment configuration
 */

const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

// Lazy load providers to avoid loading both at startup
let geminiProvider = null;
let openaiProvider = null;

const getGeminiProvider = async () => {
  if (!geminiProvider) {
    const { geminiModel, generationConfigs } = await import("./gemini.js");
    geminiProvider = { geminiModel, generationConfigs };
  }
  return geminiProvider;
};

const getOpenAIProvider = async () => {
  if (!openaiProvider) {
    const { callOpenAI } = await import("./openai.js");
    openaiProvider = { callOpenAI };
  }
  return openaiProvider;
};

/**
 * Generate content using configured AI provider
 * @param {string} prompt - The prompt to send to AI
 * @param {object} options - Provider-specific options
 * @returns {Promise<string>} Generated response
 */
export const generateContent = async (prompt, options = {}) => {
  if (AI_PROVIDER === "openai") {
    const { callOpenAI } = await getOpenAIProvider();
    return await callOpenAI(prompt, {
      systemPrompt: options.systemPrompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2048,
    });
  } else {
    // Default to Gemini
    const { geminiModel, generationConfigs } = await getGeminiProvider();
    const config = generationConfigs[options.mode] || generationConfigs.balanced;

    const result = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: config,
      systemInstruction: options.systemPrompt,
    });

    return result.response.text();
  }
};

/**
 * Get current AI provider name
 */
export const getCurrentProvider = () => AI_PROVIDER;

/**
 * Check if provider is available
 */
export const isProviderConfigured = async () => {
  try {
    if (AI_PROVIDER === "openai") {
      await getOpenAIProvider();
    } else {
      await getGeminiProvider();
    }
    return true;
  } catch (error) {
    console.error(`AI provider ${AI_PROVIDER} not configured:`, error.message);
    return false;
  }
};
