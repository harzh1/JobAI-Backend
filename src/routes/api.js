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
import {
  connectAccountController,
  getAccountsController,
  deleteAccountController,
  googleAuthUrlController,
  googleAuthCallbackController,
  microsoftAuthUrlController,
  microsoftAuthCallbackController,
  updateAccountController,
} from "../controllers/accountController.js";
import {
  createTemplateController,
  getTemplatesController,
  updateTemplateController,
  deleteTemplateController,
} from "../controllers/templateController.js";
import {
  createCampaignController,
  getCampaignsController,
  getCampaignController,
  updateCampaignStatusController,
  deleteCampaignController,
  resendCampaignController,
  updateCampaignController,
} from "../controllers/campaignController.js";
import { trackOpenController } from "../controllers/trackingController.js";

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

/**
 * Campaigns, Templates & Accounts routes
 */
// Accounts
router.post("/accounts", authenticateToken, connectAccountController);
router.get("/accounts", authenticateToken, getAccountsController);
router.put("/accounts/:accountId", authenticateToken, updateAccountController);
router.delete("/accounts/:accountId", authenticateToken, deleteAccountController);
router.get("/accounts/google/auth", authenticateToken, googleAuthUrlController);
router.get("/accounts/google/callback", googleAuthCallbackController);
router.get("/accounts/microsoft/auth", authenticateToken, microsoftAuthUrlController);
router.get("/accounts/microsoft/callback", microsoftAuthCallbackController);

// Templates
router.post("/templates", authenticateToken, createTemplateController);
router.get("/templates", authenticateToken, getTemplatesController);
router.put("/templates/:templateId", authenticateToken, updateTemplateController);
router.delete("/templates/:templateId", authenticateToken, deleteTemplateController);

// Campaigns
router.post("/campaigns", authenticateToken, createCampaignController);
router.get("/campaigns", authenticateToken, getCampaignsController);
router.get("/campaigns/:id", authenticateToken, getCampaignController);
router.put("/campaigns/:campaignId", authenticateToken, updateCampaignController);
router.put("/campaigns/:campaignId/status", authenticateToken, updateCampaignStatusController);
router.post("/campaigns/:campaignId/resend", authenticateToken, resendCampaignController);
router.delete("/campaigns/:campaignId", authenticateToken, deleteCampaignController);

// Tracking Routes (No auth required, accessible from emails)
router.get("/track/open", trackOpenController);

export default router;
