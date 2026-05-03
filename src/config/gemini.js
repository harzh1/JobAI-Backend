import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI with API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-2.0-flash";

// Validate API key exists (only warn if truly missing)
if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
  throw new Error(
    "ERROR: GEMINI_API_KEY not set in environment variables. Add it to your .env file."
  );
}

// Initialize with validated API key
export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Log successful initialization
console.log("✓ Gemini AI initialized successfully");

// Get the Gemini model
export const geminiModel = genAI.getGenerativeModel({
  model: GEMINI_MODEL_NAME,
});

// Generation configs for different use cases
export const generationConfigs = {
  precise: {
    temperature: 0.1,
    maxOutputTokens: 2048,
  },
  balanced: {
    temperature: 0.5,
    maxOutputTokens: 2048,
  },
  creative: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  },
};
