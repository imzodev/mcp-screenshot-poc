// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatMessage,
  ChatSession,
  detectScreenshotIntent,
  extractUrlFromPrompt,
  generateChatResponse
} from '@/utils/gemini';

// In-memory storage for chat sessions (would use a database in production)
const chatSessions = new Map<string, ChatSession>();

const MessageSchema = z.object({
  sessionId: z.union([z.string(), z.null(), z.undefined()]),
  message: z.string().min(1, { message: 'Message is required' }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = MessageSchema.parse(body);
    const { message, sessionId } = validatedData;

    // Get or create a chat session
    let session: ChatSession;
    if (sessionId && typeof sessionId === 'string' && chatSessions.has(sessionId)) {
      session = chatSessions.get(sessionId)!;
      session.updatedAt = new Date();
    } else {
      const newSessionId = uuidv4();
      session = {
        id: newSessionId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      chatSessions.set(newSessionId, session);
    }

    // Add user message to the session
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    // Check if the message contains a screenshot intent
    const isScreenshotIntent = await detectScreenshotIntent(message);

    let assistantMessage: ChatMessage;
    let screenshotData: string | null = null;
    let extractedUrl: string | null = null;

    if (isScreenshotIntent) {
      // Extract URL from the message
      extractedUrl = await extractUrlFromPrompt(message);

      if (extractedUrl) {
        try {
          // Call the screenshot API
          const screenshotResponse = await fetch(new URL('/api/screenshot', req.url), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: extractedUrl }),
          });

          const screenshotResult = await screenshotResponse.json();

          if (screenshotResult.success) {
            screenshotData = screenshotResult.base64Data;

            // Create assistant message with screenshot
            assistantMessage = {
              role: 'assistant',
              content: `I've taken a screenshot of ${extractedUrl} for you.`,
              timestamp: new Date(),
              isScreenshot: true,
              screenshotUrl: extractedUrl,
              screenshotBase64: screenshotData,
            };
          } else {
            // Screenshot failed
            assistantMessage = {
              role: 'assistant',
              content: `I tried to take a screenshot of ${extractedUrl}, but encountered an error: ${screenshotResult.error}`,
              timestamp: new Date(),
            };
          }
        } catch (error: any) {
          console.error('Screenshot API Error:', error);
          assistantMessage = {
            role: 'assistant',
            content: `I tried to take a screenshot, but encountered an error: ${error.message || 'Unknown error'}`,
            timestamp: new Date(),
          };
        }
      } else {
        // Could not extract URL
        assistantMessage = {
          role: 'assistant',
          content: "I'd be happy to take a screenshot for you, but I couldn't identify a specific website URL in your request. Could you please provide the URL of the website you'd like me to capture?",
          timestamp: new Date(),
        };
      }
    } else {
      // Regular chat message - generate a response
      const responseText = await generateChatResponse(session.messages);
      assistantMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
    }

    // Add assistant message to the session
    session.messages.push(assistantMessage);

    // Return the response
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      response: assistantMessage,
      extractedUrl,
      isScreenshotIntent,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while processing your message.'
    }, { status: 500 });
  }
}

// Get chat history for a session
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({
      success: false,
      error: 'Session ID is required'
    }, { status: 400 });
  }

  const session = chatSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({
      success: false,
      error: 'Session not found'
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    sessionId: session.id,
    messages: session.messages,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}
