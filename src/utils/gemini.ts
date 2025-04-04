// src/utils/gemini.ts
import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
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

// Types for chat messages
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isScreenshot?: boolean;
  screenshotUrl?: string;
  screenshotBase64?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

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

/**
 * Detect if a message contains a screenshot intent
 * @param message The user message to analyze
 * @returns True if the message contains a screenshot intent, false otherwise
 */
export async function detectScreenshotIntent(message: string): Promise<boolean> {
  try {
    const systemPrompt = `
      You are an intent detection system. Your task is to determine if the user is asking to take a screenshot of a website.
      Respond with "YES" if the user is asking for a screenshot of a website, or "NO" if not.
      Only respond with "YES" or "NO", nothing else.
    `;

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: message }] }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const text = result.response.text().trim().toUpperCase();
    return text === "YES";
  } catch (error) {
    console.error("Error detecting screenshot intent:", error);
    return false;
  }
}

/**
 * Convert chat messages to the format expected by the Gemini API
 */
function convertMessagesToGeminiFormat(messages: ChatMessage[]): Content[] {
  // Filter out system messages as Gemini doesn't support them
  return messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : message.role,
      parts: [{ text: message.content }] as Part[],
    }));
}

/**
 * Generate a response to a chat message
 * @param messages The chat history
 * @returns The assistant's response
 */
export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    // Create a new array with only user and assistant messages
    // Gemini only supports 'user' and 'model' roles
    const validMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

    // If this is the first user message, add context about the assistant's capabilities
    if (validMessages.length === 1 && validMessages[0].role === 'user') {
      // For the first message, we'll prepend instructions to the user's message
      const originalContent = validMessages[0].content;
      validMessages[0].content = `Context: You are a helpful assistant that can take screenshots of websites when asked. Be conversational and friendly. If I ask about taking a screenshot, let me know you can help with that.

User message: ${originalContent}`;
    }

    const geminiMessages = convertMessagesToGeminiFormat(validMessages);

    const result = await model.generateContent({
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    return result.response.text();
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I encountered an error while processing your message. Please try again.";
  }
}
