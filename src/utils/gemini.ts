// src/utils/gemini.ts
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";
import 'dotenv/config';

// Initialize the Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-pro';

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in environment variables");
}

console.log(`Using Gemini model: ${modelName}`);

const genAI = new GoogleGenerativeAI(apiKey || "");

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

// Define the screenshot function declaration
export const takeScreenshotFunctionDeclaration: FunctionDeclaration = {
  name: 'take_screenshot',
  description: 'Takes a screenshot of a specified website URL.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: {
        type: SchemaType.STRING,
        description: 'The URL of the website to capture a screenshot of. Should include http:// or https:// protocol.',
      },
    },
    required: ['url'],
  },
};

// Define the response type for function calls
export interface FunctionCallResult {
  text: string;
  functionCall?: {
    name: string;
    args: any;
  };
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

    // Get a basic model without function calling
    const basicModel = genAI.getGenerativeModel({ model: modelName });

    // Generate content with the model
    const result = await basicModel.generateContent({
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
 * Generate a response to a chat message with function calling
 * @param messages The chat history
 * @returns The assistant's response and any function calls
 */
export async function generateChatResponse(messages: ChatMessage[]): Promise<FunctionCallResult> {
  try {
    // Create a new array with only user and assistant messages
    // Gemini only supports 'user' and 'model' roles
    const validMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

    // Convert messages to the format expected by Gemini
    const geminiMessages = validMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Create a model with function calling capabilities
    const modelWithFunctions = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
      tools: [{
        functionDeclarations: [takeScreenshotFunctionDeclaration]
      }],
    });

    // Generate content with the model
    const result = await modelWithFunctions.generateContent({
      contents: geminiMessages,
    });

    const response = result.response;
    const responseText = response.text();

    // Check if there's a function call in the response
    try {
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0];
        return {
          text: responseText,
          functionCall: {
            name: functionCall.name,
            args: functionCall.args,
          },
        };
      }
    } catch (error) {
      console.error("Error checking function calls:", error);
      // Continue with normal response if function call check fails
    }

    // Return just the text if no function call
    return { text: responseText };
  } catch (error) {
    console.error("Error generating chat response:", error);
    return {
      text: "I'm sorry, I encountered an error while processing your message. Please try again."
    };
  }
}
