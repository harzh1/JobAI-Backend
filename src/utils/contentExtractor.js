import axios from "axios";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

/**
 * Fetch webpage content from a URL
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} The HTML content
 */
export const fetchWebpage = async (url) => {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
    timeout: 10000,
  });
  return response.data;
};

/**
 * Extract clean text content from HTML using Readability.js
 * @param {string} html - The HTML content
 * @param {string} url - The original URL (for context)
 * @returns {object} Object containing textContent and title
 */
export const extractContent = (html, url) => {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  let textContent = "";
  let title = "";

  if (article && article.textContent) {
    textContent = article.textContent;
    title = article.title || "";
    console.log(`Readability extracted: ${title || "No title"}`);
  } else {
    textContent = dom.window.document.body?.textContent || "";
    console.log("Readability fallback: using body text");
  }

  // Clean up the text
  textContent = textContent
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim()
    .slice(0, 30000); // Limit for Gemini

  return { textContent, title };
};

/**
 * Fetch and extract content from a URL
 * @param {string} url - The URL to fetch and extract
 * @returns {Promise<object>} Object containing textContent and title
 */
export const fetchAndExtract = async (url) => {
  console.log(`Fetching URL: ${url}`);
  const html = await fetchWebpage(url);
  return extractContent(html, url);
};
