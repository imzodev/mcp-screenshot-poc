// src/utils/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

// Initialize the Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in environment variables");
}

console.log(`Using Gemini model: ${modelName}`);

const genAI = new GoogleGenerativeAI(apiKey || "");

// Get the model
const model = genAI.getGenerativeModel({ model: modelName });

/**
 * Extract a URL from a natural language prompt
 * @param prompt The natural language prompt from the user
 * @returns The extracted URL or null if no URL was found
 */
export async function extractUrlFromPrompt(prompt: string): Promise<string | null> {
  try {
    // Create a system prompt to guide Gemini
    const systemPrompt = `
      You are a helpful assistant that extracts URLs from user requests.
      If the user asks to take a screenshot of a website, extract the URL.
      If the URL doesn't include a protocol (http:// or https://), add https://.
      If no URL is found, respond with "NO_URL_FOUND".
      Only return the URL, nothing else.
    `;

    // Generate content with the model
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for more deterministic results
        maxOutputTokens: 100,
      },
    });

    const text = result.response.text().trim();

    // Check if the response indicates no URL was found
    if (text === "NO_URL_FOUND") {
      return null;
    }

    // Basic URL validation
    try {
      // Try to create a URL object to validate
      const url = new URL(text);
      return url.toString();
    } catch (error) {
      // If it's not a valid URL with protocol, try adding https://
      if (!text.startsWith('http://') && !text.startsWith('https://')) {
        try {
          const urlWithProtocol = new URL(`https://${text}`);
          return urlWithProtocol.toString();
        } catch {
          return null;
        }
      }
      return null;
    }
  } catch (error) {
    console.error("Error extracting URL from prompt:", error);
    return null;
  }
}
