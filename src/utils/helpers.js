import { auth } from "../config/firebase.js";

/**
 * Verify Firebase ID token from Authorization header
 * @param {string} token - Firebase ID token
 * @returns {Promise<object>} Decoded token with uid
 * @throws {Error} If token is invalid
 */
export const verifyFirebaseToken = async (token) => {
  try {
    const decoded = await auth.verifyIdToken(token);
    console.log("Token verified for user:", decoded.uid);
    return decoded;
  } catch (error) {
    console.error("Failed to verify ID token:", error);
    throw new Error("Invalid authentication token");
  }
};

/**
 * Parse JSON from Gemini response (handles markdown code blocks)
 * @param {string} responseText - The raw response from Gemini
 * @returns {object} The parsed JSON object
 * @throws {Error} If parsing fails
 */
export const parseGeminiJsonResponse = (responseText) => {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanedResponse);
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", responseText);
    throw new Error("Failed to parse AI response as JSON");
  }
};

/**
 * Handle errors and format error responses
 * @param {Error} error - The error to handle
 * @param {string} context - Context for error message
 * @returns {object} Error response object
 */
export const handleError = (error, context = "operation") => {
  console.error(`Error in ${context}:`, error);

  // Check for axios errors
  if (error.isAxiosError) {
    return {
      success: false,
      error: `Failed to fetch URL: ${error.message}`,
      code: "fetch_failed",
    };
  }

  return {
    success: false,
    error: `Failed in ${context}: ${error.message}`,
    code: "internal_error",
  };
};
