import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  parseUrlController,
  parseTextController,
} from "../controllers/parsingController.js";
import {
  analyzeController,
  analyzeJobDescriptionController,
  generateCoverLetterController,
  getInterviewTipsController,
} from "../controllers/analysisController.js";
import {
  uploadResumeController,
  getUserResumesController,
  deleteResumeController,
} from "../controllers/resumeController.js";

const router = express.Router();

/**
 * Parsing routes
 */
// POST /api/parse-url - Parse URL and extract structured data
router.post("/parse-url", authenticateToken, parseUrlController);

// POST /api/parse-text - Parse text and extract structured data
router.post("/parse-text", authenticateToken, parseTextController);

/**
 * Analysis routes
 */
// POST /api/analyze - General LLM analysis
router.post("/analyze", authenticateToken, analyzeController);

// POST /api/analyze-job - Analyze job description
router.post("/analyze-job", authenticateToken, analyzeJobDescriptionController);

// POST /api/generate-cover-letter - Generate cover letter
router.post(
  "/generate-cover-letter",
  authenticateToken,
  generateCoverLetterController
);

// POST /api/interview-tips - Get interview preparation tips
router.post("/interview-tips", authenticateToken, getInterviewTipsController);

/**
 * Resume management routes
 */
// POST /api/upload-resume - Upload resume to Cloudinary
router.post("/upload-resume", authenticateToken, uploadResumeController);

// GET /api/resumes - Get all user resumes
router.get("/resumes", authenticateToken, getUserResumesController);

// DELETE /api/resumes/:resumeId - Delete a resume
router.delete("/resumes/:resumeId", authenticateToken, deleteResumeController);

export default router;
