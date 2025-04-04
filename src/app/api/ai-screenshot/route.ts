// src/app/api/ai-screenshot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractUrlFromPrompt } from '@/utils/gemini';
import { z } from 'zod';

const RequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt is required' }),
});

export async function POST(req: NextRequest) {
  let validatedData;
  try {
    const body = await req.json();
    validatedData = RequestSchema.parse(body);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const { prompt } = validatedData;
  
  try {
    // Extract URL from the prompt using Gemini
    const url = await extractUrlFromPrompt(prompt);
    
    if (!url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not extract a valid URL from your request. Please try again with a clearer URL.' 
      }, { status: 400 });
    }
    
    console.log(`AI extracted URL: ${url} from prompt: "${prompt}"`);
    
    // Call the existing screenshot API with the extracted URL
    const screenshotResponse = await fetch(new URL('/api/screenshot', req.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    const screenshotResult = await screenshotResponse.json();
    
    if (!screenshotResponse.ok || !screenshotResult.success) {
      throw new Error(screenshotResult.error || 'Failed to fetch screenshot.');
    }
    
    return NextResponse.json({
      success: true,
      base64Data: screenshotResult.base64Data,
      extractedUrl: url,
    });
    
  } catch (error: any) {
    console.error('AI Screenshot Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An error occurred while processing your request.' 
    }, { status: 500 });
  }
}
