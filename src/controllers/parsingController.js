import { db } from "../config/firebase.js";
import { generateContent, getCurrentProvider } from "../config/aiProvider.js";
import { fetchAndExtract } from "../utils/contentExtractor.js";
import { parseGeminiJsonResponse, handleError } from "../utils/helpers.js";
import { getParsingPrompt } from "../prompts/parsingPrompts.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Parse URL and extract structured data
 */
export const parseUrlController = async (req, res, next) => {
  try {
    const { url, parseType = "job" } = req.body;
    const uid = req.user.uid;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    // Step 1 & 2: Fetch and extract content
    const { textContent, title } = await fetchAndExtract(url);

    if (!textContent || textContent.length < 50) {
      return res.status(422).json({
        success: false,
        error: "Could not extract meaningful content from the URL",
      });
    }

    // Step 3: Get the appropriate prompt
    const prompt = getParsingPrompt(parseType, url, textContent);

    // Step 4: Call AI provider to parse the content
    console.log(`Calling ${getCurrentProvider()} to parse URL...`);
    const responseText = await generateContent(prompt, {
      mode: "precise",
      systemPrompt: "You are a job parsing expert. Extract structured job information.",
    });

    const parsedContent = parseGeminiJsonResponse(responseText);

    // Step 5: Save to Firestore for caching/history
    await db
      .collection("users")
      .doc(uid)
      .collection("parsedUrls")
      .add({
        url,
        parseType,
        parsedData: parsedContent,
        pageTitle: title,
        aiProvider: getCurrentProvider(),
        createdAt: new Date(),
      });

    console.log("✓ Successfully parsed URL:", url);

    return res.json({
      success: true,
      url,
      parseType,
      data: parsedContent,
    });
  } catch (error) {
    const errorResponse = handleError(error, "URL parsing");
    return res
      .status(500)
      .json(errorResponse);
  }
};

/**
 * Parse text content and extract structured data
 */
export const parseTextController = async (req, res, next) => {
  try {
    const {
      textContent,
      url,
      title,
      parseType = "job",
      save = true,
      parsedContent: providedParsedContent = null,
    } = req.body;

    const uid = req.user.uid;

    const normalizedUrl =
      typeof url === "string" && url.length > 0 ? url.replace(/\/$/, "") : null;

    if ((!textContent || textContent.length < 50) && !providedParsedContent) {
      return res.status(400).json({
        success: false,
        error: "Not enough meaningful text content",
      });
    }

    let parsedContent = providedParsedContent;

    if (!parsedContent) {
      // Generate prompt
      const prompt = getParsingPrompt(parseType, url, textContent);

      // Call AI provider
      const responseText = await generateContent(prompt, {
        mode: "precise",
        systemPrompt: "You are a job parsing expert. Extract structured job information.",
      });

      parsedContent = parseGeminiJsonResponse(responseText);
    }

    // Check if job already exists
    let existingJobId = null;
    let alreadySaved = false;

    if (normalizedUrl) {
      const existingSnapshot = await db
        .collection("jobs")
        .where("sourceUrl", "==", normalizedUrl)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        existingJobId = existingSnapshot.docs[0].id;
        const savedDoc = await db
          .collection("users")
          .doc(uid)
          .collection("savedJobs")
          .doc(existingJobId)
          .get();
        alreadySaved = savedDoc.exists;
      }
    }

    if (!save) {
      return res.json({
        success: true,
        data: parsedContent,
        alreadySaved,
        jobId: existingJobId,
      });
    }

    if (alreadySaved && existingJobId) {
      return res.json({
        success: true,
        data: parsedContent,
        alreadySaved: true,
        jobId: existingJobId,
      });
    }

    // Save to Firestore
    let jobId = existingJobId;
    if (!jobId) {
      const jobDoc = await db.collection("jobs").add({
        title: parsedContent.title || null,
        company: parsedContent.company || null,
        companyWebsite: parsedContent.companyWebsite || null,
        location: parsedContent.location || null,
        type: parsedContent.type || null,
        experience: parsedContent.experience || null,
        salary: parsedContent.salary || null,
        applyBy: parsedContent.applyBy || null,
        description: parsedContent.description || null,
        responsibilities: parsedContent.responsibilities || [],
        requirements: parsedContent.requirements || [],
        skills: parsedContent.skills || [],
        tags: parsedContent.skills || [],
        benefits: parsedContent.benefits || [],
        applyUrl: parsedContent.applyUrl || null,
        sourceUrl: normalizedUrl || parsedContent.sourceUrl || null,
        pageTitle: title || null,
        logo: "💼",
        color: "bg-gray-50 text-gray-600 border-gray-100",
        referrals: [],
        parsedAt: new Date(),
        updatedAt: new Date(),
      });
      jobId = jobDoc.id;
    }

    await db
      .collection("users")
      .doc(uid)
      .collection("savedJobs")
      .doc(jobId)
      .set({
        jobId,
        savedAt: new Date(),
        notes: null,
        jobSnapshot: {
          title: parsedContent.title || null,
          company: parsedContent.company || null,
          companyWebsite: parsedContent.companyWebsite || null,
          location: parsedContent.location || null,
          salary: parsedContent.salary || null,
          type: parsedContent.type || null,
          logo: "💼",
          sourceUrl: normalizedUrl || parsedContent.sourceUrl || null,
          applyUrl: parsedContent.applyUrl || null,
        },
      });

    return res.json({
      success: true,
      data: parsedContent,
      alreadySaved: false,
      jobId,
    });
  } catch (error) {
    const errorResponse = handleError(error, "text parsing");
    return res
      .status(500)
      .json(errorResponse);
  }
};
