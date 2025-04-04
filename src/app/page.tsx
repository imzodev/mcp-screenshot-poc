// src/app/page.tsx
'use client';

import { useState } from 'react';

export default function HomePage() {
  const [url, setUrl] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'ai'>('url');

  const handleFetchScreenshot = async () => {
    if (!url) {
      setError('Please enter a valid URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScreenshotData(null);
    setExtractedUrl(null);

    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch screenshot.');
      }

      setScreenshotData(result.base64Data);

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message || 'An unexpected error occurred.');
      setScreenshotData(null); // Clear any previous screenshot on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIScreenshot = async () => {
    if (!prompt) {
      setError('Please enter a description of the website you want to screenshot.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScreenshotData(null);
    setExtractedUrl(null);

    try {
      const response = await fetch('/api/ai-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch screenshot.');
      }

      setScreenshotData(result.base64Data);
      setExtractedUrl(result.extractedUrl);

    } catch (err: any) {
      console.error("AI Fetch Error:", err);
      setError(err.message || 'An unexpected error occurred.');
      setScreenshotData(null); // Clear any previous screenshot on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">MCP Playwright Screenshot</h1>

      <div className="w-full max-w-xl space-y-4 bg-white p-8 rounded-lg shadow-md">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('url')}
            className={`py-2 px-4 font-medium ${activeTab === 'url' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            URL Input
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2 px-4 font-medium ${activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            AI Assistant
          </button>
        </div>

        {/* URL Input Tab */}
        {activeTab === 'url' && (
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              required
            />
            <button
              onClick={handleFetchScreenshot}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {isLoading ? 'Loading...' : 'Get Screenshot'}
            </button>
          </div>
        )}

        {/* AI Input Tab */}
        {activeTab === 'ai' && (
          <div className="flex flex-col space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the website you want to screenshot, e.g., 'Take a screenshot of the NASA homepage'"
              disabled={isLoading}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              required
            />
            <button
              onClick={handleAIScreenshot}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {isLoading ? 'Loading...' : 'Get AI Screenshot'}
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-600 bg-red-100 border border-red-400 px-4 py-2 rounded-md text-sm">
            Error: {error}
          </p>
        )}

        {extractedUrl && (
          <p className="text-green-600 bg-green-100 border border-green-400 px-4 py-2 rounded-md text-sm">
            AI extracted URL: <a href={extractedUrl} target="_blank" rel="noopener noreferrer" className="underline">{extractedUrl}</a>
          </p>
        )}
      </div>


      {screenshotData && (
        <div className="mt-8 w-full max-w-4xl bg-white p-6 rounded-lg shadow-md">
           <h2 className="text-2xl font-semibold mb-4 text-gray-700">Screenshot Preview</h2>
          <div className="mb-4 border border-gray-200 rounded overflow-hidden">
            <img
              src={`data:image/png;base64,${screenshotData}`}
              alt="Website Screenshot"
              className="w-full h-auto object-contain" // Adjust styling as needed
            />
          </div>
          <a
            href={`data:image/png;base64,${screenshotData}`}
            download={`screenshot-${extractedUrl ? new URL(extractedUrl).hostname : (url ? new URL(url).hostname : 'website')}.png`}
            className="inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-150 ease-in-out"
          >
            Download Screenshot
          </a>
        </div>
      )}
    </main>
  );
}