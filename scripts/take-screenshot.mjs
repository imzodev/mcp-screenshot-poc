// scripts/take-screenshot.mjs
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';

// Pure functions for data validation and extraction
const UrlSchema = z.string().url();

const validateUrl = (url) => {
  try {
    UrlSchema.parse(url);
    return { isValid: true, url };
  } catch (error) {
    console.log({ error })
    return { isValid: false, error: `Invalid URL provided: ${url}` };
  }
};

const createTransport = () => new StdioClientTransport({
  command: 'npx',
  args: [
    '@playwright/mcp@latest',
    '--vision',
    '--headless',
    '--browser', 'chrome',
    '--isolated',
    '--no-sandbox'
  ],
});

const createClient = () => new Client(
  {
    name: 'nextjs-poc-client',
    version: '1.0.0',
  },
  {
    capabilities: { tools: {} },
  }
);

// Pure function for extracting base64 data
const extractBase64Data = (result) => {
  const hasValidImageData = result?.content?.[0]?.data && 
                           result?.content?.[0]?.type === 'image';
  
  return hasValidImageData 
    ? { 
        success: true, 
        data: result.content[0].data,
        message: "Successfully extracted base64 data from result.content[0].data"
      }
    : { 
        success: false, 
        data: '',
        message: 'Could not find base64 data in the expected structure: result.content[0].data'
      };
};

// Pure function for logging to stderr
const logError = (message) => {
  console.error(message);
  return message;
};

// Pure function for writing output
const writeOutput = (data) => {
  process.stdout.write(data);
  return data;
};

// Higher-order function for safe client disconnection
const withClientDisconnection = (client) => async (operation) => {
  try {
    const result = await operation();
    return result;
  } finally {
    if (client.state === 'connected') {
      logError('Disconnecting MCP client...');
      await client.disconnect();
      logError('MCP Client disconnected.');
    }
  }
};

// Compose navigation and screenshot operations
const navigateAndScreenshot = (client) => async (url) => {
  logError(`MCP Client connected. Navigating to: ${url}`);
  
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url },
  });
  
  logError('Navigation complete. Taking screenshot...');
  
  const result = await client.callTool({
    name: 'browser_screen_capture',
    arguments: { raw: true },
  });
  
  logError('Screenshot taken. Processing result...');
  logError('MCP Screenshot RAW Result: ' + JSON.stringify(result, null, 2));
  
  return result;
};

// Main execution pipeline
const executeScreenshot = async (url) => {
  const transport = createTransport();
  const client = createClient();
  const safeOperation = withClientDisconnection(client);
  
  return await safeOperation(async () => {
    await client.connect(transport);
    
    const screenshotResult = await navigateAndScreenshot(client)(url);
    const extractionResult = extractBase64Data(screenshotResult);
    
    logError(extractionResult.message);
    
    return extractionResult.success 
      ? writeOutput(extractionResult.data)
      : writeOutput('') && logError("No base64 data extracted, writing empty stdout.");
  });
};

// Error handling wrapper
const withErrorHandling = (operation) => async (...args) => {
  try {
    await operation(...args);
    process.exit(0);
  } catch (error) {
    logError('MCP Script Error: ' + error.message);
    process.exit(1);
  }
};

// Application entry point
const run = withErrorHandling(async () => {
  const targetUrl = process.argv[2];
  const urlValidation = validateUrl(targetUrl);
  
  if (!urlValidation.isValid) {
    logError(urlValidation.error);
    process.exit(1);
  }
  
  await executeScreenshot(urlValidation.url);
});

// Functional pipeline execution
const main = () => run();

main();