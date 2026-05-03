/**
 * Prompt templates for AI analysis tasks
 */

/**
 * System context prompts for different analysis types
 */
export const systemContexts = {
  general: "You are a helpful AI assistant for job seekers.",
  resume:
    "You are an expert resume reviewer and career coach. Provide actionable feedback.",
  cover_letter:
    "You are an expert at writing compelling cover letters tailored to specific job postings.",
  interview:
    "You are an interview coach helping candidates prepare for job interviews.",
  job_match:
    "You are a job matching expert who analyzes how well a candidate fits a job posting.",
};

/**
 * Get system context based on analysis type
 * @param {string} type - The type of analysis
 * @returns {string} The system context
 */
export const getSystemContext = (type) => {
  return systemContexts[type] || systemContexts.general;
};

/**
 * Generate job analysis prompt
 * @param {string} jobDescription - The job description to analyze
 * @param {string|null} userResume - Optional user resume for comparison
 * @returns {string} The prompt for Gemini
 */
export const getJobAnalysisPrompt = (jobDescription, userResume = null) => {
  let prompt = `Analyze this job description and provide:
1. Key requirements summary
2. Must-have vs nice-to-have skills
3. Red flags (if any)
4. Tips for applying
5. Estimated salary range (if not mentioned)

Job Description:
${jobDescription}`;

  if (userResume) {
    prompt += `\n\nCompare with this resume and provide a match score (0-100) with recommendations:\n${userResume}`;
  }

  return prompt;
};

/**
 * Generate cover letter prompt
 * @param {object} jobDetails - The job details
 * @param {object} userProfile - The user's profile
 * @returns {string} The prompt for Gemini
 */
export const getCoverLetterPrompt = (
  jobDetails,
  userProfile
) => `Generate a professional cover letter for this job:

Job Details:
${JSON.stringify(jobDetails, null, 2)}

Candidate Profile:
${JSON.stringify(userProfile, null, 2)}

Requirements:
- Professional but personable tone
- Highlight relevant experience
- Show enthusiasm for the role
- Keep it concise (250-350 words)`;

/**
 * Generate interview tips prompt
 * @param {string} jobTitle - The job title
 * @param {string} company - The company name (optional)
 * @returns {string} The prompt for Gemini
 */
export const getInterviewTipsPrompt = (
  jobTitle,
  company
) => `Provide interview preparation for:
Job Title: ${jobTitle}
Company: ${company || "Not specified"}

Include:
1. 5 common interview questions with sample answers
2. Technical questions to expect
3. Questions to ask the interviewer
4. Salary negotiation tips`;
