// src/utils/gemini.ts
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, FunctionCallingMode } from "@google/generative-ai";
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
  description: 'Takes a screenshot of a specified website URL. Use this function when the user asks to see what a website looks like or requests a screenshot of a website.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: {
        type: SchemaType.STRING,
        description: 'The URL of the website to capture a screenshot of. If the user mentions a website name without a full URL (like "BBC", "CNN", etc.), construct the URL by adding "https://www." prefix and the appropriate domain suffix (usually ".com", ".org", or country code like ".co.uk" for BBC).',
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
      // Set tool config to encourage function calling
      toolConfig: {
        functionCallingConfig: {
          // Use AUTO to let the model decide when to call functions
          mode: FunctionCallingMode.AUTO,
        },
      },
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
