import { generateContent, getCurrentProvider } from "../config/aiProvider.js";
import {
  getSystemContext,
  getJobAnalysisPrompt,
  getCoverLetterPrompt,
  getInterviewTipsPrompt,
} from "../prompts/analysisPrompts.js";
import { handleError } from "../utils/helpers.js";

/**
 * General LLM analysis
 */
export const analyzeController = async (req, res, next) => {
  try {
    const { prompt, type = "general" } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
    }

    const systemContext = getSystemContext(type);
    const fullPrompt = `${systemContext}\n\n${prompt}`;

    const response = await generateContent(fullPrompt, {
      systemPrompt: systemContext,
    });

    return res.json({
      success: true,
      response,
      type,
      provider: getCurrentProvider(),
    });
  } catch (error) {
    const errorResponse = handleError(error, "AI analysis");
    return res.status(500).json(errorResponse);
  }
};

/**
 * Analyze job description
 */
export const analyzeJobDescriptionController = async (req, res, next) => {
  try {
    const { jobDescription, userResume } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        error: "Job description is required",
      });
    }

    const prompt = getJobAnalysisPrompt(jobDescription, userResume);
    const analysis = await generateContent(prompt, {
      systemPrompt: "You are an expert career coach. Analyze job descriptions and provide insights.",
    });

    return res.json({
      success: true,
      analysis,
      provider: getCurrentProvider(),
    });
  } catch (error) {
    const errorResponse = handleError(error, "job analysis");
    return res.status(500).json(errorResponse);
  }
};

/**
 * Generate cover letter
 */
export const generateCoverLetterController = async (req, res, next) => {
  try {
    const { jobDetails, userProfile } = req.body;

    if (!jobDetails) {
      return res.status(400).json({
        success: false,
        error: "Job details are required",
      });
    }

    const prompt = getCoverLetterPrompt(jobDetails, userProfile);
    const coverLetter = await generateContent(prompt, {
      systemPrompt: "You are an expert cover letter writer. Write professional, compelling cover letters.",
    });

    return res.json({
      success: true,
      coverLetter,
      provider: getCurrentProvider(),
    });
  } catch (error) {
    const errorResponse = handleError(error, "cover letter generation");
    return res.status(500).json(errorResponse);
  }
};

/**
 * Get interview tips
 */
export const getInterviewTipsController = async (req, res, next) => {
  try {
    const { jobTitle, company } = req.body;

    if (!jobTitle) {
      return res.status(400).json({
        success: false,
        error: "Job title is required",
      });
    }

    const prompt = getInterviewTipsPrompt(jobTitle, company);
    const tips = await generateContent(prompt, {
      systemPrompt: "You are an expert interview coach. Provide practical, actionable interview tips.",
    });

    return res.json({
      success: true,
      tips,
      provider: getCurrentProvider(),
    });
  } catch (error) {
    const errorResponse = handleError(error, "interview tips generation");
    return res.status(500).json(errorResponse);
  }
};
