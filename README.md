# MCP Screenshot POC

This is a [Next.js](https://nextjs.org) project that demonstrates integration with [Playwright MCP (Model Context Protocol)](https://github.com/microsoft/playwright-mcp) for taking screenshots using AI.

## Prerequisites

Before getting started, you'll need:

1. **Google AI Studio API Key**: Get your API key from [aistudio.google.com](https://aistudio.google.com)
2. **Docker** (for containerized deployment)
3. **Node.js** (for local development)

## Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your environment variables in `.env`:
```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

To get your `GEMINI_API_KEY`:
- Visit [aistudio.google.com](https://aistudio.google.com)
- Sign in with your Google account
- Navigate to API keys section
- Create a new API key
- Copy and paste it into your `.env` file

## Docker Deployment

### Platform Considerations

The choice of platform depends on your system architecture and Playwright browser compatibility:

#### Option 1: ARM64 Platform (Native Apple Silicon)
Use this for better performance on Apple Silicon Macs, but note that Chrome is not available on Linux ARM64.

```bash
docker run -it --rm -w="/app" -p 3000:3000 -v $PWD:/app --name app node:22 bash
```

**Inside the container:**
```bash
# Install system dependencies for Playwright
npx playwright install-deps

# Install available browsers (chromium, firefox, webkit - NO chrome)
npx playwright install chromium firefox webkit

# Clean and install Node.js dependencies
rm -rf node_modules package-lock.json .next
npm install

# Start the development server
npm run dev
```

**Note**: With ARM64, you must use `chromium` instead of `chrome` in your Playwright MCP configuration.

#### Option 2: x86_64 Platform (Maximum Compatibility)
Use this for full Chrome support and maximum Playwright compatibility:

```bash
docker run -it --rm --platform linux/amd64 -w="/app" -p 3000:3000 -v $PWD:/app --name app node:22 bash
```

**Inside the container:**
```bash
# Install system dependencies for Playwright
npx playwright install-deps

# Install all browsers including Chrome
npx playwright install

# Clean and install Node.js dependencies (important for platform switch)
rm -rf node_modules package-lock.json .next
npm install

# Start the development server
npm run dev
```

**Note**: With x86_64, you can use `chrome` in your Playwright MCP configuration.

## Local Development (without Docker)

If you prefer to run locally without Docker:

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install-deps
npx playwright install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Browser Configuration

The project uses different browsers based on platform:

- **ARM64 Linux**: Use `chromium`, `firefox`, or `webkit`
- **x86_64 Linux**: Use `chrome`, `chromium`, `firefox`, `webkit`, or `msedge`

Update your MCP configuration in `scripts/take-screenshot.mjs` accordingly:

```javascript
// For ARM64
args: ['@playwright/mcp@latest', '--vision', '--headless', '--browser', 'chromium', '--isolated', '--no-sandbox']

// For x86_64
args: ['@playwright/mcp@latest', '--vision', '--headless', '--browser', 'chrome', '--isolated', '--no-sandbox']
```

## Troubleshooting

### Browser Installation Issues
```bash
# Force reinstall browsers
npx playwright install --force

# Check available browsers
ls -la /root/.cache/ms-playwright/
```

### Platform-related Issues
```bash
# Check current platform
uname -m  # Should show x86_64 or aarch64
node -p "process.arch"  # Should show x64 or arm64

# If switching platforms, always clean dependencies
rm -rf node_modules package-lock.json .next
npm install
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) - browser automation via MCP
- [Google AI Studio](https://aistudio.google.com) - get your Gemini API key
- [Model Context Protocol](https://github.com/modelcontextprotocol) - learn about MCP

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
