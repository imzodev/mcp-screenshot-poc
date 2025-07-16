// src/app/api/screenshot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().url({ message: 'Invalid URL provided' }),
});

export async function POST(req: NextRequest) {
  const validatedData = await (async () => {
    try {
      const body = await req.json();
      return RequestSchema.parse(body);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid request body or URL.';
      throw NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }
  })();

  if (validatedData instanceof NextResponse) {
    return validatedData;
  }

  const { url } = validatedData;
  const scriptPath = path.join(process.cwd(), 'scripts', 'take-screenshot.mjs');

  console.log(`API: Attempting to run script: node ${scriptPath} ${url}`);

  return new Promise<NextResponse>((resolve) => {
    const command = 'node';
    const args = [scriptPath, url];

    const state = {
      stdoutData: '',
      stderrData: '',
      processError: null as Error | null
    };

    const child = spawn(command, args);

    child.stdout.on('data', (data) => {
      state.stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
        // Log stderr from the script for debugging
        const errLine = data.toString().trim();
        if (errLine) {
           console.error(`MCP Script STDERR: ${errLine}`);
           state.stderrData += errLine + '\n';
        }
    });

    child.on('error', (error: Error) => {
      console.error(`API: Failed to spawn child process: ${error.message}`);
      state.processError = error;
      // Don't resolve yet, wait for 'close'
    });

    child.on('close', (code) => {
      console.log(`API: Child process exited with code ${code}`);

      if (state.processError) {
        // Error during spawning
         resolve(NextResponse.json({ success: false, error: `Failed to start screenshot process: ${state.processError.message}` }, { status: 500 }));
      } else if (code !== 0) {
        // Script exited with an error code
        resolve(NextResponse.json({ success: false, error: `Screenshot script failed (code ${code}). Check server logs. Output: ${state.stderrData}` }, { status: 500 }));
      } else if (!state.stdoutData) {
         // Script succeeded but produced no output
         resolve(NextResponse.json({ success: false, error: 'Screenshot script succeeded but returned no data.' }, { status: 500 }));
      }
      else {
        // Success
        resolve(NextResponse.json({ success: true, base64Data: state.stdoutData }));
      }
    });
  });
}