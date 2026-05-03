import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Validate API key
if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === "") {
  throw new Error(
    "ERROR: OPENAI_API_KEY not set in environment variables. Add it to your .env file."
  );
}

// Initialize OpenAI client
export const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

console.log("✓ OpenAI initialized successfully");

// Wrapper to call OpenAI API with consistent interface
export const callOpenAI = async (prompt, options = {}) => {
  try {
    const response = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: options.systemPrompt || "You are a helpful assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
};
