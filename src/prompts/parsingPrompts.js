/**
 * Prompt templates for job-related AI tasks
 */

/**
 * Generate a job parsing prompt
 * @param {string} url - The URL being parsed
 * @param {string} textContent - The extracted text content
 * @returns {string} The prompt for Gemini
 */
export const getJobParsingPrompt = (
  url,
  textContent
) => `You are a job listing parser. Extract structured information from this job posting.

IMPORTANT RULES:
1. Only extract information that is EXPLICITLY stated in the job posting
2. If a field is not mentioned or cannot be found, use null - DO NOT guess or infer
3. For arrays (skills, responsibilities, requirements, benefits), use empty array [] if none found
4. For companyWebsite: Extract the company's website domain. If not found explicitly, derive it from the company name (e.g., "Google" -> "google.com", "Microsoft" -> "microsoft.com", "Amazon" -> "amazon.com")
5. Return ONLY valid JSON, no additional text

Return ONLY valid JSON with these EXACT fields:
{
  "title": "Exact job title as stated" or null,
  "company": "Company name as stated" or null,
  "companyWebsite": "Company website domain without https:// (e.g., google.com)" or null,
  "location": "Location (city, state, country) or Remote as stated" or null,
  "type": "Full-time/Part-time/Contract/Internship as stated" or null,
  "experience": "Required experience (e.g., '3-5 years', 'Senior level')" or null,
  "salary": "Salary range exactly as mentioned" or null,
  "applyBy": "Application deadline date if mentioned" or null,
  "description": "Job description/summary - extract the main overview paragraph" or null,
  "responsibilities": ["responsibility 1", "responsibility 2", ...] or [],
  "requirements": ["requirement 1", "requirement 2", ...] or [],
  "skills": ["skill1", "skill2", "skill3", ...] or [],
  "benefits": ["benefit1", "benefit2", ...] or [],
  "applyUrl": "Direct application URL if found" or null,
  "sourceUrl": "${url}"
}

Job posting content from ${url}:
${textContent}`;

/**
 * Generate a company parsing prompt
 * @param {string} url - The URL being parsed
 * @param {string} textContent - The extracted text content
 * @returns {string} The prompt for Gemini
 */
export const getCompanyParsingPrompt = (
  url,
  textContent
) => `You are a company information extractor. Extract structured information about the company.

Return ONLY valid JSON with these fields (use null for missing info):
{
  "name": "Company name",
  "industry": "Industry/sector",
  "size": "Company size",
  "headquarters": "HQ location",
  "description": "Company description",
  "culture": "Company culture summary",
  "website": "Company website"
}

Content from ${url}:
${textContent}`;

/**
 * Generate a general content parsing prompt
 * @param {string} url - The URL being parsed
 * @param {string} textContent - The extracted text content
 * @returns {string} The prompt for Gemini
 */
export const getGeneralParsingPrompt = (
  url,
  textContent
) => `Extract the main information from this webpage content in a structured JSON format.
Include relevant fields based on the content type.

Content from ${url}:
${textContent}`;

/**
 * Get the appropriate parsing prompt based on type
 * @param {string} parseType - Type of parsing (job, company, general)
 * @param {string} url - The URL being parsed
 * @param {string} textContent - The extracted text content
 * @returns {string} The prompt for Gemini
 */
export const getParsingPrompt = (parseType, url, textContent) => {
  switch (parseType) {
    case "job":
      return getJobParsingPrompt(url, textContent);
    case "company":
      return getCompanyParsingPrompt(url, textContent);
    default:
      return getGeneralParsingPrompt(url, textContent);
  }
};
