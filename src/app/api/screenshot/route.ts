// src/app/api/screenshot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().url({ message: 'Invalid URL provided' }),
});

export async function POST(req: NextRequest) {
  let validatedData;
  try {
    const body = await req.json();
    validatedData = RequestSchema.parse(body);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request body or URL.' }, { status: 400 });
  }

  const { url } = validatedData;
  const scriptPath = path.join(process.cwd(), 'scripts', 'take-screenshot.mjs');

  console.log(`API: Attempting to run script: node ${scriptPath} ${url}`);

  return new Promise<NextResponse>((resolve) => {
    const command = 'node';
    const args = [scriptPath, url];

    let stdoutData = '';
    let stderrData = '';
    let processError: Error | null = null;

    const child = spawn(command, args);

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
        // Log stderr from the script for debugging
        const errLine = data.toString().trim();
        if (errLine) {
           console.error(`MCP Script STDERR: ${errLine}`);
           stderrData += errLine + '\n';
        }
    });

    child.on('error', (error) => {
      console.error(`API: Failed to spawn child process: ${error.message}`);
      processError = error;
      // Don't resolve yet, wait for 'close'
    });

    child.on('close', (code) => {
      console.log(`API: Child process exited with code ${code}`);

      if (processError) {
        // Error during spawning
         resolve(NextResponse.json({ success: false, error: `Failed to start screenshot process: ${processError.message}` }, { status: 500 }));
      } else if (code !== 0) {
        // Script exited with an error code
        resolve(NextResponse.json({ success: false, error: `Screenshot script failed (code ${code}). Check server logs. Output: ${stderrData}` }, { status: 500 }));
      } else if (!stdoutData) {
         // Script succeeded but produced no output
         resolve(NextResponse.json({ success: false, error: 'Screenshot script succeeded but returned no data.' }, { status: 500 }));
      }
      else {
        // Success
        resolve(NextResponse.json({ success: true, base64Data: stdoutData }));
      }
    });
  });
}